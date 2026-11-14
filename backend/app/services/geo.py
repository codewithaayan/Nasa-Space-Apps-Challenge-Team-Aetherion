import numpy as np


def parse_bbox(value: str) -> list[float]:
    try:
        box = [float(part) for part in value.split(',')]
    except ValueError as exc:
        raise ValueError('bbox must contain four numbers: west,south,east,north') from exc
    if len(box) != 4 or not np.isfinite(box).all():
        raise ValueError('bbox must contain four finite numbers')
    west, south, east, north = box
    if not (-180 <= west <= 180 and -180 <= east <= 180
            and -90 <= south < north <= 90) or west == east:
        raise ValueError('Invalid bbox; longitude must be [-180,180], south < north')
    return box
