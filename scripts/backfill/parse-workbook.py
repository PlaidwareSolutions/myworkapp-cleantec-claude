#!/usr/bin/env python3
"""Parse Regional_Bin_Tags_Summary_Official.xlsx into loads.json for the history backfill.

Usage: python3 scripts/backfill/parse-workbook.py docs/Regional_Bin_Tags_Summary_Official.xlsx scripts/backfill/loads.json

Rules (agreed with Cleantec, 2026-10-30):
  - Only the loads on "Bin Activity Summary" are in scope; hidden tabs are ignored.
  - Detail tab is authoritative for PO, customer spelling and the tag list.
  - Load 25670: tab rows are a copy of the 83216 return, so header comes from the summary row.
  - Load C259: dates from summary (2025), PO 76-04696 with 4000001 as note, 392 tags, Nevada Fresh Pak - Yerington.
  - C071 is excluded (client decision 2026-10-30: not needed).
Stdlib only (the workbook is strict OOXML, which openpyxl does not read).
"""
import sys, re, os, io, json, zipfile, datetime, collections
import xml.etree.ElementTree as ET

NS = {'m': 'http://purl.oclc.org/ooxml/spreadsheetml/main',
      'r': 'http://purl.oclc.org/ooxml/officeDocument/relationships'}
EPC_PREFIX = '000000000000000065'
WORKBOOK_NAME = 'Regional_Bin_Tags_Summary_Official.xlsx'

SKIP = {'C071': 'Client decision 2026-10-30: not needed'}

OVERRIDES = {
    '25670': {'header_from': 'summary', 'note': 'Detail tab rows duplicated the 83216 return; header taken from summary row'},
    'C259': {'order_date': '2025-06-15', 'ship_date': '2025-06-16', 'po': '76-04696',
             'po_note': 'Summary page PO 4000001', 'customer': 'Nevada Fresh Pak - Yerington',
             'note': 'Client decision 2026-10-30: dates per summary (2025), PO 76-04696 (4000001 kept as note), 392 tags per tab, customer Nevada Fresh Pak - Yerington'},
}


def colnum(ref):
    s = 0
    for ch in re.match(r'([A-Z]+)', ref).group(1):
        s = s * 26 + ord(ch) - 64
    return s


def excel_date(v):
    try:
        f = float(v)
    except ValueError:
        return v
    return (datetime.datetime(1899, 12, 30) + datetime.timedelta(days=f)).date().isoformat()


class Workbook:
    def __init__(self, path):
        self.z = zipfile.ZipFile(path)
        sst = ET.fromstring(self.z.read('xl/sharedStrings.xml'))
        self.ss = [''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])) for si in sst.findall('m:si', NS)]
        rels = ET.fromstring(self.z.read('xl/_rels/workbook.xml.rels'))
        self.rels = {r.get('Id'): r.get('Target') for r in rels}
        st = ET.fromstring(self.z.read('xl/styles.xml'))
        numfmts = {int(nf.get('numFmtId')): nf.get('formatCode') for nf in st.iter('{%s}numFmt' % NS['m'])}
        self.xfs = []
        for xf in st.find('m:cellXfs', NS):
            nid = int(xf.get('numFmtId', '0'))
            code = numfmts.get(nid, '')
            builtin = nid in (14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47)
            custom = bool(re.search(r'[ymd]', code.lower().replace('red', ''))) and 'General' not in code
            self.xfs.append(builtin or custom)
        wb = ET.fromstring(self.z.read('xl/workbook.xml'))
        self.sheets = []
        for sh in wb.find('m:sheets', NS):
            target = self.rels[sh.get('{%s}id' % NS['r'])]
            self.sheets.append((sh.get('name'), sh.get('state', 'visible'), 'xl/' + target))

    def rows(self, path):
        rows = {}
        for c in ET.fromstring(self.z.read(path)).iter('{%s}c' % NS['m']):
            ref, t, s = c.get('r'), c.get('t'), int(c.get('s', '0'))
            v, isel, val = c.find('m:v', NS), c.find('m:is', NS), None
            if t == 's' and v is not None:
                val = self.ss[int(v.text)]
            elif t == 'inlineStr' and isel is not None:
                val = ''.join(x.text or '' for x in isel.iter('{%s}t' % NS['m']))
            elif t in ('d', 'str') and v is not None:
                val = v.text
            elif t == 'b' and v is not None:
                val = bool(int(v.text))
            elif v is not None:
                val = v.text
                if s < len(self.xfs) and self.xfs[s]:
                    val = excel_date(val)
            if val is None:
                continue
            rows.setdefault(int(re.search(r'\d+', ref).group()), {})[colnum(ref)] = val
        return rows


def norm_bol(s):
    return re.sub(r'^[CS]-?', '', str(s).strip()).lower()


def tag_num(v):
    return int(float(str(v).strip()))


def epc(n):
    return EPC_PREFIX + f'{n:06d}'


def ranges(nums):
    nums = sorted(set(nums))
    if not nums:
        return ''
    out, a, b = [], nums[0], nums[0]
    for n in nums[1:]:
        if n == b + 1:
            b = n
        else:
            out.append((a, b)); a = b = n
    out.append((a, b))
    return ', '.join(f'{x}-{y}' if x != y else str(x) for x, y in out)


def main(xlsx, out):
    wb = Workbook(xlsx)
    detail = {}
    hidden = []
    summary = None
    for name, state, path in wb.sheets:
        rows = wb.rows(path)
        if name == 'Bin Activity Summary':
            summary = rows
            continue
        if state == 'hidden':
            hidden.append(name)
            continue
        recs = []
        for rn in sorted(rows):
            if rn < 4 or rows[rn].get(12) is None:
                continue
            r = rows[rn]
            recs.append({'row': rn, 'tag': tag_num(r[12]), 'order_date': r.get(1), 'ship_date': r.get(3),
                         'bol': str(r.get(4)), 'po': r.get(5), 'customer': r.get(6), 'picked_from': r.get(9),
                         'returned_to': r.get(11), 'direction': 'OUTBOUND' if r.get(8) else 'INBOUND'})
        detail[name] = recs

    loads = []
    skipped = []
    for rn in sorted(summary):
        if rn < 4:
            continue
        r = summary[rn]
        bol = str(r[4]).strip()
        if bol in SKIP:
            skipped.append({'bol': bol, 'reason': SKIP[bol]})
            continue
        direction = 'OUTBOUND' if r.get(8) else 'INBOUND'
        qty = int(float(r.get(8) or r.get(10) or 0))
        tab = next((n for n in detail if norm_bol(n) == norm_bol(bol)), None)
        ov = OVERRIDES.get(bol, {})
        load = {
            'bol': bol, 'sheet': tab, 'summary_row': rn, 'direction': direction, 'quantity': qty,
            'order_date': r.get(1), 'ship_date': r.get(3), 'po': (str(r.get(5)).strip() if r.get(5) else None),
            'customer': str(r.get(6)).strip(), 'warehouse': (r.get(9) or r.get(11) or '').strip(),
            'summary_tag_spec': r.get(12), 'notes': [], 'tags': [],
        }
        if tab is not None:
            recs = detail[tab]
            if ov.get('header_from') != 'summary':
                first = recs[0]
                load['order_date'] = first['order_date'] or load['order_date']
                load['ship_date'] = first['ship_date'] or load['ship_date']
                load['po'] = (str(first['po']).strip() if first['po'] else None)
                load['customer'] = str(first['customer']).strip()
            row_date_varies = len({x['ship_date'] for x in recs}) > 1 and ov.get('header_from') != 'summary'
            for x in recs:
                load['tags'].append({'number': x['tag'], 'epc': epc(x['tag']),
                                     'date': x['ship_date'] if row_date_varies else load['ship_date'],
                                     'sheet': tab, 'row': x['row']})
            if len(load['tags']) != qty:
                load['notes'].append(f'Tab has {len(load["tags"])} tags but summary quantity is {qty}')
            if len({t['number'] for t in load['tags']}) != len(load['tags']):
                load['notes'].append('Duplicate tag numbers on tab')
        else:
            load['notes'].append('No detail tab: header-only order without tags')
        for k in ('order_date', 'ship_date', 'po', 'customer'):
            if k in ov:
                load[k] = ov[k]
        if 'po_note' in ov:
            load['po_note'] = ov['po_note']
        if 'note' in ov:
            load['notes'].append(ov['note'])
        if load['po'] and load['po'].lower().startswith('sarah'):
            load['po_note'] = f'PO column said "{load["po"]}"'
            load['po'] = None
        loads.append(load)

    loads.sort(key=lambda l: (l['ship_date'], l['bol']))
    result = {'source': WORKBOOK_NAME, 'generated': datetime.datetime.now(datetime.UTC).isoformat(timespec='seconds'),
              'hidden_sheets_ignored': hidden, 'skipped_loads': skipped, 'loads': loads}
    with open(out, 'w') as f:
        json.dump(result, f, indent=1)

    print(f"{'BOL':8s} {'dir':8s} {'order':10s} {'ship':10s} {'qty':>4s} {'tags':>4s} {'customer':32s} {'warehouse':16s} PO / notes")
    for l in loads:
        print(f"{l['bol']:8s} {l['direction']:8s} {l['order_date']:10s} {l['ship_date']:10s} {l['quantity']:4d} {len(l['tags']):4d} "
              f"{l['customer']:32s} {l['warehouse']:16s} {l['po'] or '-'}  {'; '.join(l['notes'])}")
        if l['tags']:
            print(f"{'':8s} ranges: {ranges(t['number'] for t in l['tags'])}")
    print(f"\nloads={len(loads)} tag rows={sum(len(l['tags']) for l in loads)} hidden ignored={hidden} skipped={[x['bol'] for x in skipped]}\nwrote {out}")


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
