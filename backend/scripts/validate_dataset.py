import argparse
import json

from app.services.data import LocalDataSource, regional_series
from app.services.geo import parse_bbox
from app.services.statistics import monthly_series


def main():
    parser = argparse.ArgumentParser(description='Validate prepared data without accessing NASA or computing trends')
    parser.add_argument('--var', required=True)
    parser.add_argument('--bbox', required=True)
    parser.add_argument('--start')
    parser.add_argument('--end')
    args = parser.parse_args()
    meta, da = LocalDataSource().load(args.var, parse_bbox(args.bbox), args.start, args.end)
    series = monthly_series(regional_series(da))
    print(json.dumps({'variable':meta.model_dump(), 'dimensions':dict(da.sizes),
        'first_month':str(series.index[0]), 'last_month':str(series.index[-1]),
        'finite_months':int(series.notna().sum()), 'coverage':float(series.notna().mean())}, indent=2))


if __name__ == '__main__':
    main()
