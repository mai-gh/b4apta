const Attribution = ol.control.Attribution;
const View = ol.View;
const useGeographic = ol.proj.useGeographic;
const defaultControls = ol.control.defaults.defaults;
const TileLayer = ol.layer.Tile;
const OSM = ol.source.OSM;
const Map = ol.Map;
const GeoJSON = ol.format.GeoJSON;
//const Projection = ol.proj.Projection;

const VectorLayer = ol.layer.Vector;
const VectorSource = ol.source.Vector;
const Style = ol.style.Style;
const Stroke = ol.style.Stroke;
const Fill = ol.style.Fill;
const Text = ol.style.Text;

const Feature = ol.Feature;
const Point = ol.geom.Point;
const Circle = ol.geom.Circle;
const Overlay = ol.Overlay;

//console.log('aaaaaaa', XLSX)




async function handleFileAsync(e) {
  const file = e.target.files[0];
  const fileData = await file.arrayBuffer();
  const workbook = XLSX.read(fileData);
  window.ww = workbook
  const table = workbook.Sheets['Auction List'];
  const totalRows = parseInt(ww.Sheets['Auction List']["!ref"].split(':')[1].replace(/\D/g, ""));
  const data = [];
  for (let i = 4; i <= totalRows; i++) {
    const j = i - 4;
    const item = {
      auction_id: table[`A${i}`]?.v,
      status:     table[`B${i}`]?.v,
      min_bid:    table[`C${i}`]?.v,
      close_time: table[`D${i}`]?.v,
      open_time:  table[`E${i}`]?.v,
      attorney:   table[`F${i}`]?.v,
      book_writ:  table[`G${i}`]?.v,
      opa:        table[`H${i}`]?.v,
      addr:       table[`I${i}`]?.v,
      county:     table[`J${i}`]?.v,
      type:       table[`K${i}`]?.v,
    }
    if (!data[j]) {
      item.geoData = await (await fetch(`https://nominatim.openstreetmap.org/search?q=${item.addr}&format=json&polygon=1&addressdetails=1`)).json();
      data.push(item);
      console.log(item.addr);
      localStorage.setItem('data', JSON.stringify(data));
    }
  }
  window.location.reload();
}

const inputElm = document.createElement("input");
inputElm.setAttribute('type', 'file');
inputElm.setAttribute('accept', '.xlsx');
inputElm.addEventListener("change", handleFileAsync, false);
inputElm.id = "AAA"
inputElm.click()
inputElm.style['z-index'] = 99;
inputElm.style['position'] = 'fixed';
inputElm.style['top'] = '10px';
inputElm.style['right'] = '10px';
document.body.appendChild(inputElm);

const generateVectors = () => {
  const va = [];
  localStorage.data || localStorage.setItem('data', JSON.stringify([]));
  for (let itm of JSON.parse(localStorage.data)) {
    //console.log(itm.addr)
    //if (itm.geoData[0] && itm.status == 'Sold') {
    if (itm.geoData[0]) {
      const f = new Feature(new Point([itm.geoData[0].lon , itm.geoData[0].lat]));
      f.setProperties(itm);
      va.push(
        new VectorLayer({
          source: new VectorSource({
            //features: [new Feature(new Point([-75.22532669369909, 39.967584099999996]))],
            features: [f],
          }),
          style: {
            'circle-radius': 6,
            'circle-fill-color': 'blue',
            'circle-stroke-color': 'black',
            'circle-stroke-width': 2,
          },
          data: itm,
        }),
      )
    } else {
      console.log('-------------------------------------------')
      console.log(`NO GEODAT FOR ${itm.addr}`)
      console.log(`https://www.google.com/maps/place/${encodeURIComponent(itm.addr)}`)
      console.log(`https://property.phila.gov/?p=${itm.opa}`);
      console.log(`https://www.bid4assets.com/auction/index/${itm.auction_id}`);
    }
  }
  return va;
};



useGeographic();
const map = new Map({
  target: "map",
  view: new View({

//438, North 52nd Street, Philadelphia
//lat	"39.967584099999996"
//lon	"-75.22532669369909"

    center: [-75.22532669369909, 39.967584099999996],
    zoom: 11,
  }),
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
    ...generateVectors()
  ],
});

// ---------------- pop over stuff ---------------- //

const container = document.getElementById("popup");
const content = document.getElementById("popup-content");
const closer = document.getElementById("popup-closer");

const overlay = new Overlay({
  element: container,
  autoPan: {
    animation: {
      duration: 250,
    },
  },
});
map.addOverlay(overlay);

closer.onclick = function () {
  overlay.setPosition(undefined);
  closer.blur();
  return false;
};

map.on("singleclick", function (evt) {
  const feature = map.getFeaturesAtPixel(evt.pixel, {hitTolerance: 1})[0];

  if (!feature) {
    overlay.setPosition(undefined);
    return;
  }

  const coordinate = evt.coordinate;
  const streetViewURL = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coordinate[1]},${coordinate[0]}`;
  const infoHTML = `
    <div>
      <table>
        <tr><td>Address:</td><td>${feature.get('addr')}</td></tr>
      </table>
      <br>
      <div><a href="https://www.bid4assets.com/auction/index/${feature.get('auction_id')}" target="_blank" >Auction Site</a></div>
      <div><a href="https://property.phila.gov/?p=${feature.get('opa')}" target="_blank" >Property Data</a></div>
      <div><a href="https://li.phila.gov/property-history/search?address=${feature.get('addr')}" target="_blank" >Permits, licenses, violations</a></div>
      <div><a href="${streetViewURL}" target="_blank" >Street View</a></div>
    </div>
  `;

  console.log(feature.get('addr'));
  content.innerHTML = infoHTML;
  overlay.setPosition(coordinate);
});

map.on("pointermove", function (event) {
  const type = map.hasFeatureAtPixel(event.pixel) ? "pointer" : "inherit";
  map.getViewport().style.cursor = type;
});
