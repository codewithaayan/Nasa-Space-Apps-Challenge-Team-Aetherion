"""Read-only live HTTP checks against a local running backend."""
import argparse
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def verify(base_url, location=None):
    def get(path):
        with urlopen(Request(base_url.rstrip('/') + path,
                     headers={'Origin': 'http://localhost:5173'}), timeout=60) as response:
            assert response.status == 200
            assert response.headers['Access-Control-Allow-Origin'] == 'http://localhost:5173'
            return json.load(response)

    locations = [location] if location else ['karachi', 'lahore', 'gilgit', 'islamabad', 'peshawar', 'quetta']
    datasets = []
    for city in locations:
        collection = get('/datasets?' + urlencode({'location': city}))
        assert len(collection) == 6
        assert all(dataset['location_id'] == city for dataset in collection)
        datasets.extend(collection)
    evidence = []
    for dataset in datasets:
        result = get(f'/datasets/{dataset["id"]}/analysis')
        assert len(result['series']) == dataset['monthly_slots']
        assert result['dataset']['source_sha256'] == dataset['source_sha256']
        assert result['trend'] is not None
        assert not result['dataset']['spatial_analysis_available']
        assert result['dataset']['scientific_review'] == 'unreviewed'
        evidence.append({'dataset': dataset['id'], 'months': len(result['series']),
                         'units': dataset['units'], 'direction': result['trend']['direction']})
    query = urlencode({'start': '2006-01-01', 'end': '2006-12-01'})
    short = get(f'/datasets/{locations[0]}_temperature/analysis?' + query)
    assert len(short['series']) == 12 and short['trend'] is None
    print(json.dumps({'live_csv_checks': 'passed', 'datasets': evidence,
                      'short_selection': 'source values available; inference withheld'}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:8000')
    parser.add_argument('--location', choices=['karachi', 'lahore', 'gilgit', 'islamabad', 'peshawar', 'quetta'])
    args = parser.parse_args()
    verify(args.base_url, args.location)
