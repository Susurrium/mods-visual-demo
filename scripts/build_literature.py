import json
import re
from collections import Counter, defaultdict
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT.parent / '证据卡与题录总表_复核用版.xlsx'
DEST = ROOT / 'public' / 'literature'
DOMAINS = {'呼吸': '呼吸', '凝血': '凝血', '肝功能': '肝功能', '循环': '循环', '神经': '中枢神经', '肾': '肾功能', 'MODS': '综合', '综合': '综合'}


def rows(sheet):
    values = sheet.values
    headers = next(values)
    for row in values:
        if any(value is not None for value in row):
            yield dict(zip(headers, row))


def labels(value):
    text = str(value or '')
    return list(dict.fromkeys(label for keyword, label in DOMAINS.items() if keyword.lower() in text.lower()))


def clean(row):
    return {str(k): v.isoformat() if hasattr(v, 'isoformat') else v for k, v in row.items() if k and k not in ('原文文件', '查看题录')}


def main():
    book = openpyxl.load_workbook(SOURCE, read_only=True, data_only=True)
    cards = [clean(row) for row in rows(book['证据卡'])]
    papers = [clean(row) for row in rows(book['题录总表'])]
    ids = [p['文献编号'] for p in papers]
    card_ids = [c['卡片编号'] for c in cards]
    if len(ids) != len(set(ids)) or len(card_ids) != len(set(card_ids)):
        raise ValueError('存在重复的文献编号或卡片编号')
    missing = sorted({c['文献编号'] for c in cards} - set(ids))
    if missing:
        raise ValueError(f'证据卡缺少对应题录：{missing}')
    by_paper = defaultdict(list)
    for card in cards:
        card['领域'] = labels(card.get('主题'))
        by_paper[card['文献编号']].append(card['卡片编号'])
    duplicates = defaultdict(list)
    unknown = Counter()
    for paper in papers:
        paper['领域'] = labels(paper.get('主题'))
        paper['证据卡编号'] = by_paper.get(paper['文献编号'], [])
        if not paper['领域']:
            unknown[str(paper.get('主题') or '(空)')] += 1
        doi = re.sub(r'^https?://(dx\.)?doi\.org/', '', str(paper.get('DOI') or '').strip().lower())
        if doi:
            duplicates[doi].append(paper['文献编号'])
    DEST.mkdir(parents=True, exist_ok=True)
    def save(name, data):
        (DEST / name).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    index_fields = ('文献编号', '题名', '第一作者', '年份', '期刊', 'DOI', 'PMID', '主题', '研究类型', '核对状态', '领域', '证据卡编号')
    index = []
    for offset in range(0, len(papers), 500):
        shard = offset // 500
        save(f'papers-{shard}.json', papers[offset:offset + 500])
        index.extend({**{key: paper.get(key) for key in index_fields}, '分片': shard} for paper in papers[offset:offset + 500])
    save('index.json', index)
    save('cards.json', cards)
    names = ['呼吸', '凝血', '肝功能', '循环', '中枢神经', '肾功能', '综合']
    save('summary.json', {'domains': [{'papers': sum(name in paper['领域'] for paper in papers), 'cards': sum(name in card['领域'] for card in cards)} for name in names]})
    save('report.json', {'题录数': len(papers), '证据卡数': len(cards), '有证据卡文献数': len(by_paper), '缺少关联': missing, '无法识别主题': dict(unknown), '重复DOI候选': {k: v for k, v in duplicates.items() if len(v) > 1}, '领域映射规则': DOMAINS})
    print(f'题录 {len(papers)}，证据卡 {len(cards)}，有证据卡文献 {len(by_paper)}，无法识别主题 {sum(unknown.values())}')


if __name__ == '__main__':
    main()
