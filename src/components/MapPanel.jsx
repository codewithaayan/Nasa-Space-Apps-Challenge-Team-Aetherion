import { CircleMarker, MapContainer, Rectangle, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { Crosshair, Layers3, MapPin } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { locations } from '../data';

function MapController({ mapRef, boundsKey }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    return () => { if (mapRef.current === map) mapRef.current = null; };
  }, [map, mapRef]);
  useEffect(() => {
    if (!boundsKey) return;
    const [w,s,e,n] = boundsKey.split(',').map(Number);
    map.fitBounds([[s,w],[n,e < w ? e + 360 : e]], { paddingTopLeft:[30,65],paddingBottomRight:[30,65],maxZoom:9,animate:false });
  }, [map,boundsKey]);
  return null;
}
const cellLabel = cell => cell.label == null ? 'Inference unavailable' : cell.label === 0 ? 'No supported trend' : cell.label > 0 ? 'Supported increase' : 'Supported decrease';
const cellColor = cell => cell.label == null ? '#9b9b9b' : cell.label === 0 ? '#8095a8' : cell.label > 0 ? '#df8d52' : '#5aa9b5';

export function MapPanel({ activeLocation='karachi',height='100%',compact=false,dataset,paradox }) {
  const selected = locations.find(location => location.id === activeLocation);
  const mapRef = useRef(null);
  const box = paradox?.bbox || dataset?.requested_bbox;
  const valid = box?.length === 4 && box.every(Number.isFinite);
  const boundsKey = valid ? box.join(',') : '';
  const centre = valid ? [(box[1]+box[3])/2, (box[0]+(box[2] < box[0] ? box[2]+360 : box[2]))/2] : selected ? [selected.lat,selected.lng] : [0,0];
  const rectangle = valid ? [[box[1],box[0]],[box[3],box[2] < box[0] ? box[2]+360 : box[2]]] : null;
  const cells = paradox?.cells || [];
  const title = selected?.name || (activeLocation === 'sahel' ? 'Western Sahel' : 'Dataset region');
  return <div className="map-frame" style={{height}} role="region" aria-label={paradox ? `Trend map with ${cells.length} source cells` : 'Location reference map'}>
    <MapContainer center={centre} zoom={valid || selected ? compact ? 8 : 7 : 2} zoomAnimation={false} scrollWheelZoom={false} key={dataset?.id || activeLocation}>
      <MapController mapRef={mapRef} boundsKey={boundsKey} />
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {selected && <CircleMarker center={[selected.lat,selected.lng]} radius={6} pathOptions={{color:'#bba16b',fillOpacity:0.3}}><Tooltip>{title} city reference; not a measurement footprint</Tooltip></CircleMarker>}
      {rectangle && !paradox && <Rectangle bounds={rectangle} pathOptions={{color:'#8095a8',weight:1,dashArray:'4',fillOpacity:0.02}}><Tooltip>Requested source selection; not a native-cell footprint</Tooltip></Rectangle>}
      {cells.map(cell => <CircleMarker key={`${cell.latitude},${cell.longitude}`} center={[cell.latitude,valid && box[0] > box[2] && cell.longitude < box[0] ? cell.longitude+360 : cell.longitude]} radius={7} pathOptions={{color:cellColor(cell),fillColor:cellColor(cell),fillOpacity:0.8,weight:1}}><Tooltip>{cell.latitude} degrees, {cell.longitude} degrees: {cellLabel(cell)}<br />Slope: {cell.slope == null ? 'Unavailable' : cell.slope.toPrecision(4)} {paradox.slope_units}<br />Raw p-value: {cell.p_value == null ? 'Unavailable' : cell.p_value.toPrecision(4)}</Tooltip></CircleMarker>)}
    </MapContainer>
    <div className="map-overlay map-top"><span><Layers3 size={14} />{paradox ? 'CELL TRENDS · FDR SCREENED' : 'LOCATION REFERENCE'}</span><button aria-label="Centre investigation area" onClick={() => { if(rectangle) mapRef.current?.fitBounds(rectangle,{paddingTopLeft:[30,65],paddingBottomRight:[30,65],maxZoom:9,animate:false}); else mapRef.current?.setView(centre,selected ? 7 : 2,{animate:false}); }}><Crosshair size={15} /></button></div>
    <div className="map-overlay map-location"><MapPin size={14} />{title.toUpperCase()}</div>
    <div className="map-caption">{paradox ? 'Orange: supported increase; teal: supported decrease; blue-grey: no supported trend; grey: inference unavailable. Points show cell centres.' : 'Reference only; no cell trend layer.'}</div>
  </div>;
}
