import karachiPhoto from "../assets/cities/karachi.jpg";
import lahorePhoto from "../assets/cities/lahore.jpg";
import islamabadPhoto from "../assets/cities/islamabad.jpg";
import quettaPhoto from "../assets/cities/quetta.jpg";
import peshawarPhoto from "../assets/cities/peshawar.jpg";
import gilgitPhoto from "../assets/cities/gilgit.jpg";

const cityPhotos = {
  karachi: karachiPhoto,
  lahore: lahorePhoto,
  islamabad: islamabadPhoto,
  quetta: quettaPhoto,
  peshawar: peshawarPhoto,
  gilgit: gilgitPhoto,
};

const topicAccents = {
  precipitation: "water",
  soil_moisture: "soil",
  evaporation: "heat",
  ndvi: "plants",
  aerosols: "air",
  temperature: "heat",
};

export function EarthArtwork() {
  return (
    <svg className="earth-svg" viewBox="0 0 620 460" role="img" aria-label="Illustrative Earth and satellite artwork, not scientific data">
      <defs>
        <radialGradient id="earth-ocean" cx="32%" cy="28%" r="74%">
          <stop offset="0" stopColor="#3B6B52" />
          <stop offset=".48" stopColor="#1E3A2F" />
          <stop offset="1" stopColor="#10241A" />
        </radialGradient>
        <linearGradient id="earth-edge" x1="0" x2="1">
          <stop stopColor="#83B084" stopOpacity=".55" />
          <stop offset=".48" stopColor="#6A9A6B" stopOpacity=".08" />
          <stop offset="1" stopColor="#0B1A13" stopOpacity=".75" />
        </linearGradient>
        <linearGradient id="land-fill" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#D9C7A7" />
          <stop offset="1" stopColor="#6A9A6B" />
        </linearGradient>
        <clipPath id="earth-disc"><circle cx="312" cy="228" r="151" /></clipPath>
      </defs>
      <ellipse className="earth-orbit orbit-a" cx="310" cy="228" rx="271" ry="92" transform="rotate(-25 310 228)" />
      <ellipse className="earth-orbit orbit-b" cx="310" cy="228" rx="236" ry="139" transform="rotate(44 310 228)" />
      <circle cx="312" cy="228" r="157" fill="#2E5240" opacity=".14" />
      <circle cx="312" cy="228" r="151" fill="url(#earth-ocean)" stroke="#6A9A6B" strokeOpacity=".4" />
      <g clipPath="url(#earth-disc)">
        <path className="earth-graticule" d="M145 228h334M161 175h302M161 281h302M312 76c-63 54-63 250 0 304M312 76c63 54 63 250 0 304M209 102c-37 77-37 175 0 252M415 102c37 77 37 175 0 252" />
        <path d="m177 153 38-42 26 10 5 25 27 9 2 24-19 18-3 32-19 20-20-18-8-35-22-12-17-31Z" fill="url(#land-fill)" opacity=".82" />
        <path d="m320 116 29-20 36 8 12 23 32 8 21 24-13 22-33 1-15 18-32-3-15 18-23-13 8-24-20-24 13-38Z" fill="url(#land-fill)" opacity=".74" />
        <path d="m345 241 27-9 24 17-5 34-18 17-5 30-22 28-14-31 6-29-12-22 19-35Z" fill="url(#land-fill)" opacity=".74" />
        <path d="M162 241c44-21 94-30 150-26 60 4 112 18 153 40" fill="none" stroke="#D9C7A7" strokeOpacity=".4" strokeDasharray="3 7" />
        <path d="M172 265c46-13 90-18 137-14 52 5 100 19 135 36" fill="none" stroke="#D9C7A7" strokeOpacity=".28" />
        <circle cx="333" cy="252" r="4" fill="#6A9A6B" />
        <circle cx="333" cy="252" r="12" fill="none" stroke="#6A9A6B" strokeOpacity=".75" />
        <circle cx="333" cy="252" r="23" fill="none" stroke="#6A9A6B" strokeOpacity=".22" strokeDasharray="2 6" />
      </g>
      <circle cx="312" cy="228" r="151" fill="url(#earth-edge)" />
      <g className="earth-satellite" transform="translate(486 74) rotate(-17)">
        <rect x="-7" y="-7" width="14" height="14" rx="2" fill="#D9C7A7" />
        <path d="M-7-4h-42v8h42M7-4h42v8H7" fill="#1E3A2F" stroke="#6A9A6B" strokeWidth="1.5" />
        <path d="M-39-4v8m8-8v8m8-8v8m8-8v8m30-8v8m8-8v8m8-8v8m8-8v8" stroke="#83B084" strokeWidth="1" />
        <path d="M0 7v11m-6 0h12m-5-7 5 7" fill="none" stroke="#D9C7A7" strokeWidth="1.5" />
      </g>
      <path d="m470 99-26 35" stroke="#D9C7A7" strokeOpacity=".58" strokeDasharray="2 5" />
      <circle cx="444" cy="136" r="3" fill="#6A9A6B" />
      <g className="earth-star" fill="#859D8B">
        <circle cx="92" cy="107" r="1.5" /><circle cx="523" cy="204" r="1.5" />
        <circle cx="133" cy="341" r="1" /><circle cx="492" cy="367" r="1.5" />
        <path d="M535 115v8m-4-4h8M104 297v7m-3.5-3.5h7" stroke="#859D8B" strokeWidth="1" />
      </g>
    </svg>
  );
}

export function TopicArtwork({ variable }) {
  const accent = topicAccents[variable] || "water";
  return (
    <svg className={`topic-art topic-art-${accent}`} viewBox="0 0 120 64" aria-hidden="true">
      <path className="topic-art-grid" d="M5 53h110M14 8v48M38 8v48M62 8v48M86 8v48M110 8v48" />
      {variable === "precipitation" && <>
        <path className="art-stroke" d="M33 31c-7 0-11-4-11-9s4-9 10-9c3-7 13-8 18-2 7-2 14 3 14 10 0 6-5 10-12 10H33Z" />
        <path className="art-accent" d="m34 38-4 9m18-9-4 9m18-9-4 9" />
      </>}
      {variable === "soil_moisture" && <>
        <path className="art-stroke" d="M15 43h90M19 48h82M27 53h66" />
        <path className="art-accent" d="M60 14c-6 9-10 13-10 19a10 10 0 0 0 20 0c0-6-4-10-10-19Z" />
        <path className="art-stroke" d="M79 44c0-12 8-19 19-20-1 10-6 18-19 20Zm0 0c-1-8-6-12-12-14" />
      </>}
      {variable === "evaporation" && <>
        <circle className="art-accent-fill" cx="43" cy="28" r="11" />
        <path className="art-accent" d="M43 8v-4m0 48v-4M23 28h-5m50 0h-5M29 14l-4-4m36 36-4-4m0-28 4-4M25 50l4-4" />
        <path className="art-stroke" d="M77 46c-6-5 6-8 0-13m14 13c-6-5 6-8 0-13" />
        <path className="art-accent" d="m75 29 3-4 3 4m8 0 3-4 3 4" />
      </>}
      {variable === "ndvi" && <>
        <path className="art-stroke" d="M61 54V19m0 20c-13 0-20-7-20-17 11-1 20 5 20 17Zm0-7c0-11 7-18 18-19 1 11-6 19-18 19Z" />
        <path className="art-accent" d="M61 39 47 25m14 5 12-10" />
        <path className="art-stroke" d="M39 54h44" />
      </>}
      {variable === "aerosols" && <>
        <path className="art-stroke" d="M20 40c7-8 17-8 23-2s15 6 22 0 16-6 24 1m-64-12c6-7 14-7 19-2m24-10c8-6 16-5 21 1" />
        <circle className="art-accent-fill" cx="37" cy="16" r="2" /><circle className="art-accent-fill" cx="88" cy="38" r="2.5" /><circle className="art-accent-fill" cx="74" cy="12" r="1.5" /><circle className="art-accent-fill" cx="29" cy="49" r="1.5" />
      </>}
      {variable === "temperature" && <>
        <path className="art-stroke" d="M54 12a8 8 0 0 1 16 0v24a15 15 0 1 1-16 0V12Z" />
        <path className="art-accent" d="M62 20v24" /><circle className="art-accent-fill" cx="62" cy="47" r="6" />
        <path className="art-stroke" d="M77 18h10m-10 9h7m-7 9h10" />
      </>}
    </svg>
  );
}

export function LocationArtwork({ locationId = "karachi", className = "" }) {
  const image = cityPhotos[locationId] || karachiPhoto;
  const cityName = locationId.charAt(0).toUpperCase() + locationId.slice(1);
  return <img className={`location-art city-photo city-photo-${locationId} ${className}`} src={image} alt={`Photograph of ${cityName}, Pakistan`} loading="lazy" decoding="async" />;
}

const pageArtLabels = {
  wizard: "CASE BUILD / SCHEMATIC",
  lab: "ORBITAL DESK / SCHEMATIC",
  cases: "FIELD ARCHIVE / SCHEMATIC",
  science: "METHODS / SCHEMATIC",
  compare: "PAIRWISE VIEW / SCHEMATIC",
  report: "CASE RECORD / SCHEMATIC",
};

export function PageArtwork({ variant = "wizard" }) {
  return (
    <svg className={`page-art page-art-${variant}`} viewBox="0 0 250 160" aria-hidden="true">
      <defs>
        <linearGradient id={`page-art-wash-${variant}`} x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#D9C7A7" stopOpacity=".2" />
          <stop offset="1" stopColor="#6A9A6B" stopOpacity=".05" />
        </linearGradient>
      </defs>
      <path className="page-art-orbit" d="M18 105C53 13 184 9 231 63s-74 83-159 65S42 66 164 31" />
      <circle cx="126" cy="79" r="55" fill={`url(#page-art-wash-${variant})`} stroke="#6A9A6B" strokeOpacity=".3" />
      <circle cx="126" cy="79" r="41" fill="none" stroke="#859D8B" strokeOpacity=".25" />
      {variant === "wizard" && <>
        <path className="page-art-line" d="M78 52h65l13 12h20v42H78zM91 72h53m-53 12h70m-70 12h43" />
        <circle className="page-art-point" cx="170" cy="48" r="6" /><circle className="page-art-point" cx="73" cy="106" r="4" />
      </>}
      {variant === "lab" && <>
        <circle cx="126" cy="79" r="25" fill="none" stroke="#D9C7A7" strokeOpacity=".65" />
        <circle cx="126" cy="79" r="10" fill="none" stroke="#D9C7A7" strokeOpacity=".55" />
        <path className="page-art-line" d="M126 25v108M72 79h108m-54 0 31-28" />
        <circle className="page-art-point" cx="157" cy="51" r="4" />
      </>}
      {variant === "cases" && <>
        <path className="page-art-line" d="M78 55h40l10 9h49v44H78zM88 46h42l9 9m-43 22h52m-52 10h61m-61 10h33" />
        <path d="M90 69h59" stroke="#D9C7A7" strokeOpacity=".75" />
      </>}
      {variant === "science" && <>
        <ellipse cx="126" cy="79" rx="45" ry="16" fill="none" stroke="#859D8B" strokeOpacity=".6" transform="rotate(-33 126 79)" />
        <ellipse cx="126" cy="79" rx="45" ry="16" fill="none" stroke="#859D8B" strokeOpacity=".42" transform="rotate(33 126 79)" />
        <circle className="page-art-point" cx="126" cy="79" r="7" />
        <circle cx="166" cy="55" r="4" fill="#6A9A6B" /><circle cx="89" cy="102" r="3" fill="#D9C7A7" />
      </>}
      {variant === "compare" && <>
        <path className="page-art-line" d="M87 99V78l17-16 17 16v21m18 0V70l18-18 18 18v29m-65-1h65" />
        <path d="M100 78h8v8h-8zm50 0h8v8h-8z" fill="#D9C7A7" fillOpacity=".7" />
        <path d="M92 112c22 13 49 13 68 0" fill="none" stroke="#D9C7A7" strokeOpacity=".8" strokeDasharray="3 5" />
      </>}
      {variant === "report" && <>
        <path className="page-art-line" d="M92 47h55l17 17v50H92zM147 47v18h17m-53 10h36m-36 11h36m-36 11h24" />
        <circle className="page-art-point" cx="154" cy="104" r="6" />
      </>}
      <text x="17" y="149" className="art-micro-label">{pageArtLabels[variant] || pageArtLabels.wizard}</text>
    </svg>
  );
}
