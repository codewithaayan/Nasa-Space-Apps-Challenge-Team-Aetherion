import argparse
from datetime import datetime, timezone
import json

from app.api.routes import timeseries, trend, paradox
from app.models.schemas import DemoResponse
from app.services.data import LocalDataSource, data_root
from app.services.geo import parse_bbox

CASES = {'sahel': [-18,10,40,20], 'amazon': [-75,-15,-45,5], 'arctic': [-180,66,180,90]}


def prepare_case(case, variable, box=None, start=None, end=None, validated_by=None):
    box = box or CASES[case]
    meta, da = LocalDataSource().load(variable, box, start, end)
    selected = (meta, da, box)
    chart = timeseries(selected)
    analysis = trend(selected)
    grid = paradox(selected)
    return DemoResponse(case=case, available=True, provenance=meta.provenance,
        source=meta.source_url or meta.source, validated_by=validated_by,
        validated=bool(validated_by), result=analysis, timeseries=chart, trend=analysis, paradox=grid,
        prepared_at=datetime.now(timezone.utc).isoformat(),
        message='Candidate case, not an established finding. ' +
            ('Scientific review recorded.' if validated_by else 'Technical precompute only; scientific review pending.'))


def main():
    parser = argparse.ArgumentParser(description='Save offline API results; never infer a paradox or validation from a case name')
    parser.add_argument('case', choices=CASES)
    parser.add_argument('--var', required=True)
    parser.add_argument('--bbox', help='Override default region (required for a point sample)')
    parser.add_argument('--start')
    parser.add_argument('--end')
    parser.add_argument('--validated-by', help='Only supply after actual scientific review')
    args = parser.parse_args()
    path = data_root() / 'demos' / f'{args.case}.json'
    if path.exists():
        raise ValueError('Demo already exists; archive/review it before regenerating')
    result = prepare_case(args.case, args.var, parse_bbox(args.bbox) if args.bbox else None,
                          args.start, args.end, args.validated_by)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x', encoding='utf-8') as handle:
        handle.write(result.model_dump_json(indent=2) + '\n')
    print(json.dumps({'case':args.case, 'provenance':result.provenance,
                      'validated':result.validated, 'message':result.message}, indent=2))


if __name__ == '__main__':
    main()
