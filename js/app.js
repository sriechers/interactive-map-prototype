const throttleFunction = function (func, delay) {
  let timerId = undefined;
  // Wenn setTimeout schon existiert abbrechen
	if (timerId) {
		return
	}

  // Timeout nach delay setzen
	timerId = setTimeout(() => {
		func()
    
    // wenn setTimeout ausgeführt wurde timerId zurücksetzen auf undefined,
    // damit das nächste event wieder einen Timeout setzen kann
    timerId = undefined;
	}, delay)
}

// Marker Gruppen Setup
let markergroups = {
  sonstiges: L.layerGroup(),
  cafe: L.layerGroup(),
  kurs: L.layerGroup(),
  shopping: L.layerGroup(),
  job: L.layerGroup(),
  meetup: L.layerGroup(),
  studium: L.layerGroup(),
  haltestelle: L.layerGroup(),
  bar: L.layerGroup(),
  park: L.layerGroup(),
  restaurant: L.layerGroup(),
  offiziell: L.layerGroup()
}
let categories = [
  'Sonstiges',
  'Studium',
  'Meetup',
  'Kurs',
  'Job',
  'Café',
  'Shopping',
  'Haltestelle',
  'Bar',
  'Park',
  'Restaurant'
]

const loadingProgress = document.querySelector('#loading-screen .loading-progress .bar');

function updateLoadingProgressBar(percent){
  loadingProgress.style.width = percent + '%';
}
function updateLoadingScreen(){
  document.querySelector('#loading-screen').classList.toggle('is-loading');
}

// Tagnamen normalisieren
function normalizeTagname(tagname){
  return tagname.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Gibt das Datum in dd/mm/yyyy wieder
function returnFormattedDate(dateObj){
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const month = monthNames[dateObj.getMonth()];
  const day = String(dateObj.getDate()).padStart(2, '0');
  const year = dateObj.getFullYear();
  return day + '. '+ month + ' ' + year;
}

// SECTION LocalStorage Management

// ANCHOR Daten in LocalStorage schieben
function pushDataToLocalStorage(data){
  let markerLocalStorage = JSON.parse(localStorage["markerList"] || "[]");
  markerLocalStorage.push(data);

  // DB Update
  createDBUpdateEvent({
    type: "set",
    data: {
      marker: data
    }
  });

  localStorage["markerList"] = JSON.stringify(markerLocalStorage);
}

// ANCHOR Marker aus dem Local Storage rausholen
function getMarkersFromLocalStorage(){

  // DB Update
  createDBUpdateEvent({
    type: "get",
    data: {
      data: 'markersAll'
    }
  });

  return JSON.parse(localStorage["markerList"] || "[]");
}

// Schauen ob ein Nutzer eingeloggt ist, wenn nicht den Wert anonym eintragen
if(!localStorage.getItem('username')){
  localStorage.setItem('username', 'anonym');
}

// !SECTION LocalStorage Management

// Click Event Listener für List Items erstellen 
function addListenerToItem(marker){
  const markerId = marker.markerId;
  // Timeout setzen um darauf zu warten, dass die Liste geupdated wurde
  const wait = setTimeout(function (){
    clearTimeout(wait);
    // Aktuelles Listen Item anhand der ID aufrufen
    const thisListItem = document.querySelector('#list_'+markerId);
    // Bei Klick auf aktuelles Item
    thisListItem && thisListItem.addEventListener('click', function (e){
      // Bei allen Listenitems die CSS Klasse "active" entfernen
      document.querySelectorAll('#marker-list li').forEach(function(item){
        item.classList.remove('active');
      });
      thisListItem.classList.add('active');
      // Karte zu der Position des Markers zoomen
      console.log(marker, marker.latlng)
      LeafletMap.setView(marker.latlng, 17);
    });
  }, 400);
}

// Inhalt des Marker Popups für die Karte rendern und zurückgeben
function returnMarkerPopupContent(data){
  return `
  <h3>${data.title}</h3>
  <div class="infos">
    <span class="category ${data.tag == 'Offiziell' ? 'official' : ''}">${data.tag}</span>
    <time>${data.date}</time>
  </div>
  <p>${data.desc}</p>
  `;
}

// SECTION Chat Setup

// Url wo der Chat Server läuft
const chatServerUrl = 'https://str-chat-api.herokuapp.com';
const loginContainer = document.getElementById('login-container');
const chatMsgCounterEl = document.getElementById('new-chatmessage-counter');

// Zähler erstellen für ungelesene Nachrichten
let chatMsgCounter = 0;
let chatObj = null;

function openChat(user){
  // Wenn es schon ein Chat Objekt gibt Funktion abbrechen
  if(chatObj) return;
  // Neuen Chat erstellen
  chatObj = new ChatClient(chatServerUrl, {
    messageContainer: document.getElementById('message-container'),
    sendContainer: document.getElementById('send-container'),
    messageInput: document.getElementById('message-input'),
    username: user,
    onMessage: function(){
      // Wenn Nachrichten ankommen, schauen ob der Chat geöffnet ist, wenn nicht dann den
      // Zähler für ungelesene Nachrichten erhöhen und den roten Punkt beim Chaticon in der Navigation aktualisieren
      if (window.getComputedStyle(document.querySelector('#chat')).display === "none"){
        chatMsgCounter++;
        chatMsgCounterEl.innerHTML = chatMsgCounter;
      };
    }
  },
  function (){
    console.log(`Chatbenutzer verbunden: ${user}`);
  });
}
// openChat(localStorage.getItem('username'));
// !SECTION Chat Setup

// SECTION Map Setup

// ANCHOR Karten Setup
const LeafletMap = new L.Map('map');

let osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
let osmAtt = '<a href="https://openstreetmap.org">OpenStreetMap</a>';
let args = {
  minZoom: 8,
  maxZoom: 19,
  attribution: osmAtt
}
let osm = new L.TileLayer(osmUrl, args);

LeafletMap.setView([53.54, 8.5835], 15);
LeafletMap.addLayer(osm);

updateLoadingProgressBar(30);


// ANCHOR Marker Icon erstellen

// const markerIcon = L.icon({
//   iconUrl: 'assets/pin.svg',
//   iconSize: [28, 49],
//   iconAnchor: [14, 48],
//   popupAnchor: [0, -50]
// });
function createMarker(latlng, type){
  let url;
  type = type || 'sonstiges';
  // Pfad zum Icon generieren
  switch (type) {
    case 'Kurs':
      url = 'assets/marker/kurs.svg';
      break;
    case 'Café':
      url = 'assets/marker/cafe.svg';
      break;
    case 'Shopping':
      url = 'assets/marker/einkaufen.svg';
      break;
    case 'Job':
      url = 'assets/marker/job.svg';
      break;
    case 'Meetup':
      url = 'assets/marker/meetup.svg';
      break;   
    case 'Studium':
      url = 'assets/marker/studium.svg';
      break;   
    case 'Haltestelle':
      url = 'assets/marker/haltestelle.svg';
      break;    
    case 'Bar':
      url = 'assets/marker/bar.svg';
      break;      
    case 'Park':
      url = 'assets/marker/park.svg';
      break;   
    case 'Restaurant':
      url = 'assets/marker/restaurant.svg';
      break;   
    case 'Offiziell':
      url = 'assets/marker/official.svg';
      break;   
    // Standard Icon wenn es type nicht gibt
    default:
      url = 'assets/pin.svg';
      break;
  }

  const markerIcon = L.icon({
    iconUrl: url,
    iconSize: [28, 49],
    iconAnchor: [14, 48],
    popupAnchor: [0, -50]
  });
  const marker = L.marker(latlng, {
    icon: markerIcon,
    zIndexOffset: 1005
  })

  // é beim Café entfernen und alles kleinschreiben, um den Typ des Markers (Café, Kurs etc.) als Variblennamen für
  // die markergroups zu verwenden
  let normalizedType = normalizeTagname(type);


  // Map aktualisieren und Marker einfügen
  LeafletMap.removeLayer(markergroups[normalizedType]);
  markergroups[normalizedType].addLayer(marker).addTo(LeafletMap); 
  return marker;
}

// !SECTION Map Setup

// SECTION Datenbank Manager
// Datenbank Updates, wenn localStorage Update durchgeführt wird (Backend nicht implementiert)
window.addEventListener('storageUpdate', function(e) {
  switch (e.detail.type) {
    case "set":
      console.log("[SET ITEM] Update in Datenbank durchführen für:", {type: 'set', ...e.detail.data});
      break;
    case "delete":
      console.log("[REMOVE ITEM] Update in Datenbank durchführen für:", {type: 'delete', ...e.detail.data});
      break;
    case "get":
      console.log("[GET ITEM] Datenbankabfrage für:", {type: 'get', ...e.detail.data});
      break;
  }
});

function createDBUpdateEvent(payload){
  window.dispatchEvent(new CustomEvent('storageUpdate', {
    detail: payload
  }));
}
// !SECTION Datenbank Manager

// SECTION Login
const loginButton = document.querySelector('#login');
const loginWindow = document.querySelector('.login-window');
// den HTML Inhalt des .login-window speichern, um später darauf zuzugreifen zu können
const loginFormTemplateCached = loginWindow.innerHTML;

function showTips(){
  if(!localStorage.getItem('showedTips')){
    document.querySelector('.tips-overlay').classList.add('show');
    localStorage.setItem('showedTips', "true");
  }
}

// ANCHOR Das User Interface des Profils updaten, je nachdem ob der User eingeloggt ist oder nicht
function updateProfileUI(user){
  if(user && user != 'anonym'){ // Wenn eingeloggt
    let template = `
    <div class="user-info">
      <h2>Willkommen bei <span class="font-blue">mapper</span>, ${user}!</h2>
    </div>
    <div class="user-profile">
      <p class="course">Digitale Medienproduktion</p>
      <p class="info">
        Erstelle <strong>Marker</strong>, indem du <strong class="font-blue">auf die Karte klickst</strong> und helfe so deinen Kommilitonen sich in Bremerhaven zurecht zu finden!
      </p>
      <button type="submit" class="button-round log-out-user">ausloggen</button>
    </div>
    <hr>
    <div class="legend">
      <h3>Legende</h3>
      <ul>
        <li>
          <img class="icon" src="assets/marker/official.svg" alt="Icon Offizieller Marker"/>
          Offizieller Marker
        </li>
        <li>
          <img class="icon" src="assets/marker/cafe.svg" alt="Icon Cafés"/>
          Café
        </li>
        <li>
          <img class="icon" src="assets/marker/einkaufen.svg" alt="Icon Shopping"/>
          Shopping
        </li>
        <li>
          <img class="icon" src="assets/marker/job.svg" alt="Icon Jobs"/>
          Jobs
        </li>
        <li>
          <img class="icon" src="assets/marker/kurs.svg" alt="Icon Kurse"/>
          Kurse
        </li>
        <li>
          <img class="icon" src="assets/marker/meetup.svg" alt="Icon Meetup"/>
          Meetup
        </li>
        <li>
        <img class="icon" src="assets/marker/studium.svg" alt="Icon Studium"/>
          Studium
        </li>
        <li>
          <img class="icon" src="assets/marker/haltestelle.svg" alt="Icon Haltestelle"/>
          Haltestelle
        </li>
        <li>
          <img class="icon" src="assets/marker/restaurant.svg" alt="Icon Restaurant"/>
          Restaurant
        </li>
        <li>
          <img class="icon" src="assets/marker/bar.svg" alt="Icon Bar"/>
          Bar
        </li>
        <li>
          <img class="icon" src="assets/pin.svg" alt="Icon Sonstiges"/>
          Sonstiges
        </li>
      </ul>
    </div>
    `;
    document.querySelectorAll('#main-header .menu-item').forEach(function(item){
      item.removeAttribute('disabled');
    });
    insertProfileTemplate(template);
    showTips();
  } else { // Wenn ausgeloggt
    document.querySelectorAll('#main-header .menu-item').forEach(function(item){
      if(item.id !== 'user-profile-button'){
        item.setAttribute('disabled', 'disabled');
      };
    });
    insertProfileTemplate(loginFormTemplateCached);
  }
}
updateProfileUI(localStorage.getItem('username'));

// ANCHOR Das Template in das HTML einfügen
function insertProfileTemplate(template){
  let container = document.createElement('div');
  container.innerHTML = template;
  loginWindow.innerHTML = '';
  loginWindow.appendChild(container);
}

// ANCHOR Wenn der Nutzer sich ein oder ausloggt, localStorage aktualisieren
function manageUser(event){
  event.preventDefault();

  // Checken ob es das Login Name Input Feld gibt
  if(document.querySelector('#login-name')){
    let username = document.querySelector('#login-name').value;
    // Update in Datenbank (nicht implementiert)
    createDBUpdateEvent({
      type: "set",
      data: {
        username: username
      }
    });
    localStorage.setItem('username', username);
    updateProfileUI(username);
  } else {
    // Update in Datenbank (nicht implementiert)
    createDBUpdateEvent({
      type: "delete",
      data: {
        username: localStorage.getItem('username')
      }
    });
    localStorage.removeItem('username');
    updateProfileUI();
  }
}

loginWindow.addEventListener('submit', manageUser);

// ANCHOR Checken ob der User eingeloggt ist und das UI anpassen (Bei öffnen der Website)
if(localStorage.getItem('username') && localStorage.getItem('username') != 'anonym'){
  updateProfileUI(localStorage.getItem('username'));
}

// !SECTION Login

// SECTION Marker Logik
// ANCHOR Marker aus dem LocalStorage laden
const existingMarkers = getMarkersFromLocalStorage();

// ANCHOR Liste erstellen, die automatisch das UI updated sobald sich data verändert
const markerList = new Reef('#marker-list', {
  data: {
    searchEmpty: false,
    markers: existingMarkers
  },
  template: function(props){
    return ` 
    ${props.searchEmpty ? '<h3 class="search-no-results">Deine Suche ergab leider keine Ergebnisse!</h3>': ''} 
    ${props.markers.map(function (marker) {
      return `
      <li id="list_${marker.markerId}">
        <h3>${marker.title}</h3>
        <div class="infos">
          <span class="category">${marker.tag}</span>
          <time>${marker.date}</time>
        </div>
        <p>${marker.desc}</p>
      </li>`;
    }).join('')}
    `;
  }
});
markerList.render();

updateLoadingProgressBar(50);


// ANCHOR Neuen Eintrag in der Markerliste erstellen 
function createListEntry(data){
  // Marker in Local Storage speichern
  pushDataToLocalStorage(data);

  markerList.data.markers.push(data);

  // Custom Event erstellen
  Reef.emit(document, 'createMarker', {
    marker: data
  });
}

// ANCHOR Event wenn die Liste geupdated wird.
// Es wird dann ein Klick Event Listener auf den Listenpunkt gesetzt
document.addEventListener('createMarker', function (event) {
  addListenerToItem(event.detail.marker)
}, false);

// ANCHOR Benutzer erstellte Marker 
function addUserMarker(e){

  // Nur ausführen wenn der Nutzer eingeloggt ist
  if(localStorage.getItem('username') && localStorage.getItem('username') != 'anonym'){
    // Marker erstellen der nur als Platzhalter auf der Map erscheint solange das Dialogfenster
    // noch nicht geschlossen ist, weil wir noch nicht wissen ob der Nutzer den Vorgang abbricht
    const placeholderIcon = L.icon({
      iconUrl: 'assets/pin.svg',
      iconSize: [28, 49],
      iconAnchor: [14, 48],
      popupAnchor: [0, -50]
    });
    let placeholderMarker = L.marker(e.latlng, {
      icon: placeholderIcon,
      zIndexOffset: 1005
    }).addTo(LeafletMap);

    // Dialogfenster öffnen
    new PromptDialog({
      create: true,
      cancelText: 'abbrechen',
      okText: 'hinzufügen',
      getUserInput: function(data) {

        // Neues Listitem hinzufügen
        data = {
          ...data,
          latlng: e.latlng,
          date: returnFormattedDate(new Date())
        }

        // Listeneintrag erstellen
        createListEntry(data);

        // Echten Marker erstellen
        let thisMarker = createMarker(e.latlng, data.tag);
      
        thisMarker
        .bindPopup(returnMarkerPopupContent(data))
        .openPopup()

        // Den Platzhalter wieder löschen
        LeafletMap.removeLayer(placeholderMarker);

        // Popup nach 5s wieder schließen
        const timeout = setTimeout(function() {
          clearTimeout(timeout);
          thisMarker.closePopup();
        }, 5000);
      },
      onCancel: function(){
        // Wenn der Nutzer den Erstellvorgang abbricht Platzhalter Marker löschen
        LeafletMap.removeLayer(placeholderMarker);
      }
    });
  } else { // User nicht eingeloggt
    Toastify({
      text: 'Du musst dich anmelden um Marker erstellen zu können',
      duration: 3000,
      newWindow: true,
      close: true,
      gravity: "top", // `top` or `bottom`
      position: "left", // `left`, `center` or `right`
      backgroundColor: "#e03a7a",
      stopOnFocus: true, // Prevents dismissing of toast on hover
    }).showToast();
    updateSidebarUI('#profile', '#user-profile-button');
  }
}

// Wenn User auf die Map klickt -> Markererstellvorgang aufrufen
LeafletMap.on('click', addUserMarker);

updateLoadingProgressBar(70);

// !SECTION Marker Logik

// SECTION Vorhandene Marker in Karte einfügen
existingMarkers.forEach(function(marker){
  addListenerToItem(marker);
  const thisMarker = createMarker(marker.latlng, marker.tag);
  thisMarker.bindPopup(returnMarkerPopupContent(marker));
});
// !SECTION Marker in Karte einfügen

function removeLayers(){
  LeafletMap.eachLayer(function(layer){
    // Wenn Layer ein Marker ist und kein TileLayer
    if( layer instanceof L.TileLayer == false ){
      LeafletMap.removeLayer(layer);
    }
  })
}
function addAllLayers(){
  for (let layer in markergroups) {
    LeafletMap.addLayer(markergroups[layer]);
  }
}
function addSpecificLayer(layername){
  LeafletMap.addLayer(markergroups[layername]);
}
// SECTION FILTER
function getMarkerSearchResults(input){
  const list = getMarkersFromLocalStorage();
  const fuse = new Fuse(list, {
    keys: ['title', 'desc', 'tag'],
    threshold: 0.2
  });

  const result = fuse.search(input);

  // Marker ein und ausblenden
  result.forEach(function(res){
    let tagname = res.item.tag.toLowerCase();
    removeLayers();
    LeafletMap.addLayer(markergroups[normalizeTagname(tagname)]);
  });
  if(result.length === 0){
    removeLayers();
    return false;
  }
  return result;
}

function searchMarkers(textSearchInput){
  let items = []; 
  removeLayers();
  // Wenn Suche leer alle Markeritems anzeigen
  if(textSearchInput.length === 0){
    markerList.data.searchEmpty = false;
    items = getMarkersFromLocalStorage();
    markerList.data.markers = items;
    items.forEach(function(marker){
      addListenerToItem(marker);
    });
    removeLayers();
    addAllLayers();
    return;
  };

  let results = getMarkerSearchResults(textSearchInput);
  // Wenn keine Ergebnisse
  if(!results){
    markerList.data.searchEmpty = true;
  }
  if(results.length){
    results.forEach(function(res){
      items.push(res.item);
      // Layer mit dem Tagnamen des Markers wieder anzeigen
      addSpecificLayer(normalizeTagname(res.item.tag));
    });
    items.forEach(function(marker){
      addListenerToItem(marker);
    });
    markerList.data.searchEmpty = false;
  }
  markerList.data.markers = items;
}

// Suchfunktion
document.querySelector('#sidebar #search').addEventListener('input', function(e){
  e.preventDefault();
  searchMarkers(e.target.value);
});

// Suchfeld außerhalb der Sidebar
document.querySelector('#marker-search').addEventListener('input', function(e){
  e.preventDefault();
  // Wenn User angemeldet -> Sidebar öffnen
  if(localStorage.getItem('username') && localStorage.getItem('username') != 'anonym'){
    updateSidebarUI('#markers', '#marker-list-button')
  }
  searchMarkers(e.target.value);
});

// !SECTION FILTER

// SECTION DUMMY DATEN FÜR PROTOTYP
const dummyMarkers = [
  {"markerId":"popup_1610566573383-142","title":"HTML-Kurs","desc":"Hallo zusammen,\nIch biete nächste Woche Dienstag einen HTML-Kurs an. Wir treffen uns im Gebäude F. Ich werde euch Grundlagen beibringen.","tag":"Kurs", "date": "16. Juni 2021","latlng":{"lat":53.5387389433671,"lng":8.581169843673708}},
  {"markerId":"popup_1610566573383-148","title":"Bestes Eiscafé in BHV","desc":"Dieser Laden ist einfach der Hammer! Außerdem gibt es Studentenrabatt. :)","tag":"Café","date": "08. Mai 2021","latlng":{"lat":53.542576706750125,"lng":8.57774815357238}},
  {"markerId":"popup_1610566573383-199","title":"Kleines Treffen am Deich","desc":"Moin Leudde,\nwir wollen uns heute um 16 Uhr am Deich treffen und bisschen quatschen. Wer Lust hat kann gerne dazukommen!","tag":"Meetup","date": "18. Juni 2021","latlng":{"lat":53.538244654126245,"lng":8.577176700965543}},
  {"markerId":"popup_1610566573383-201","title":"Tele Pizza Restaurant","desc":"Bester Lieferdienst, Beste Pizza!","tag":"Restaurant","date": "25. Januar 2021","latlng":{"lat":53.54219238209847,"lng":8.591468950447068}},
  {"markerId":"popup_1610566573383-202","title":"Unverpacktladen","desc":"Kleiner niedlicher Laden mit vielen Handmade-Sachen, nachhaltiger Ware und Lebensmitteln ohne Verpackung.","tag":"Shopping","date": "28. Januar 2021","latlng":{"lat":53.55287515089818,"lng":8.571021585423651}},
  {"markerId":"popup_1610566573383-203","title":"Findus Café","desc":"Sehr schön eingerichtetes kleines Café","tag":"Café","date": "28. Januar 2021","latlng":{"lat":53.55377878537684,"lng":8.56987982732216}},
  {"markerId":"popup_1610566573383-204","title":"One up Bar","desc":"Coole Bar in der man Gesellschaftsspiele spielen kann oder sogar Playstation und X-Box mit einem Drink!","tag":"Bar","date": "28. Januar 2021","latlng":{"lat":53.554425514412266,"lng": 8.569295671997539}},
  {"markerId":"popup_1610566573383-205","title":"24h Edeka","desc":"24h geöffnet für eure nächtliche Hungerattacken!","tag":"Shopping","date": "29. Januar 2021","latlng":{"lat":53.5600669395484,"lng": 8.565254687443888}},
  {"markerId":"popup_1610566573383-206","title":"Bowling Meet-Up??","desc":"Samstags gibt es Disco-Bowling, macht mega Spaß hier! Meldet euch!","tag":"Meetup","date": "29. Januar 2021","latlng":{"lat":53.57952018148416,"lng": 8.598028076796647}},
  {"markerId":"popup_1610566573383-207","title":"Lasertag","desc":"Wenn ihr nicht wisst was ihr machen wollt, unbedingt mal ausprobieren!","tag":"Meetup","date": "30. Januar 2021","latlng":{"lat":53.58099300135569,"lng": 8.596336302298624}},
  {"markerId":"popup_1610566573383-208","title":"Decathlon","desc":"Hier gibt's alles rund um Sport","tag":"Shopping","date": "30. Januar 2021","latlng":{"lat":53.49044702850214,"lng": 8.59782705923175}},
  {"markerId":"popup_1610566573383-209","title":"Peking Haus","desc":"Bestes China Restaurant in Bremerhaven!","tag":"Restaurant","date": "02. Februar 2021","latlng":{"lat":53.48881289937986,"lng": 8.596367937644779}},
  {"markerId":"popup_1610566573383-210","title":"Cinemotion","desc":"Das Standard-Kino in Bremerhaven","tag":"Meetup","date": "02. Februar 2021","latlng":{"lat":53.54011746239238,"lng": 8.577292067025814}},
  {"markerId":"popup_1610566573383-210","title":"Lloyds","desc":"Super Restaurant mit tollem Ambiente!","tag":"Restaurant","date": "04. Februar 2021","latlng":{"lat":53.544006470447385,"lng": 8.573279482696083}},
  {"markerId":"popup_1610566573383-211","title":"Bushaltestelle Hochschule Bremerhaven","desc":"Die Buslinien 502, 504, 505 und 506 halten hier regelmäßig.","tag":"Haltestelle","date": "04. Februar 2021","latlng":{"lat":53.540967891870594,"lng": 8.583161118426437}},
  {"markerId":"popup_1610566573383-212","title":"Hauptbahnhof Bremerhaven","desc":"Wenn ihr zur Hochschule wollt und mit dem Zug kommt, müsst ihr hier aussteigen und mit dem Bus weiter. Zufuß braucht man ungefähr 20 Minuten.","tag":"Haltestelle","date": "04. Februar 2021","latlng":{"lat":53.534899253627515,"lng": 8.598740624018333}},
  {"markerId":"popup_1610566573383-213","title":"Abou Jad","desc":"Sehr leckeres Schnellrestaurant mit arabischen und türkischen Spezialitäten in der Alten Bürger!","tag":"Restaurant","date": "02. Februar 2021","latlng":{"lat":53.552948871146526,"lng": 8.571407438590338}},
  {"markerId":"popup_1610566573383-214","title":"Quartier No.159","desc":"Tolle kleine Bar mit super gemütlicher Atmosphäre - auf jeden Fall weiterzuempfehlen!!","tag":"Bar","date": "02. Februar 2021","latlng":{"lat":53.553640703697006,"lng": 8.570735293267768}},
  {"markerId":"popup_1610566573383-215","title":"Yesterday","desc":"Wenn du Unterhaltung, richtig gute Musik und nette Leute treffen willst, ist das Yesterday sehr zu empfehlen!","tag":"Meetup","date": "02. Februar 2021","latlng":{"lat":53.55378844696952,"lng": 8.570773823824384}},
  {"markerId":"popup_1610566573383-216","title":"H&M","desc":"Sehr zentral in der Fußgängerzone, ist gut sortiert und das Personal ist super nett!","tag":"Shopping","date": "04. Februar 2021","latlng":{"lat":53.543751496430566,"lng": 8.578724933457416}},
  {"markerId":"popup_1610566573383-217","title":"Bürgerbüro Mitte","desc":"","tag":"Offiziell","date": "04. Februar 2021","latlng":{"lat":53.541535600751374,"lng": 8.580619809956424}},
  {"markerId":"popup_1610566573383-218","title":"Stadtbibliothek Bremerhaven","desc":"","tag":"Studium","date": "04. Februar 2021","latlng":{"lat":53.541466231461804,"lng": 8.580883299955909}},
  {"markerId":"popup_1610566573383-219","title":"Stadttheater Bremerhaven","desc":"Schönes, kleines und sehr charmantes Theater in zentraler Lage","tag":"Offiziell","date": "04. Februar 2021","latlng":{"lat":53.54082802865272,"lng": 8.580883299955909}},
  {"markerId":"popup_1610566573383-220","title":"B-Burger BAR","desc":"Sehr leckere Burger!!","tag":"Restaurant","date": "04. Februar 2021","latlng":{"lat":53.541110873164186,"lng": 8.581266232347014}},
  {"markerId":"popup_1610566573383-221","title":"Caspar, David & Co.","desc":"Nettes kleines Bistro in der Bremerhavener Innenstadt. Bei schönem Wetter kann man super gut draußen sitzen.","tag":"Restaurant","date": "04. Februar 2021","latlng":{"lat":53.54032321330699,"lng": 8.582404319252507}},
  {"markerId":"popup_1610566573383-222","title":"Hochschule Bremerhaven","desc":"Die Hochschule von Bremerhaven","tag":"Studium","date": "04. Februar 2021","latlng":{"lat":53.539722687297306,"lng": 8.58213589524122}},
  {"markerId":"popup_1610566573383-223","title":"Deichpromenade Bremerhaven","desc":"Toll zum Laufen und besonders bei Sonnenuntergang sehr schön. Ist immer ein Spaziergang wert - es ist recht zentral gelegen und besonders bei Sonnenuntergang super schön!","tag":"Offiziell","date": "02. Februar 2021","latlng":{"lat":53.54097459426327,"lng": 8.57562141870951}},
  {"markerId":"popup_1610566573383-224","title":"Zoo am Meer Bremerhaven","desc":"Ein sehr niedlicher, kleiner Zoo! Super tolle Lage mit sehr schönem Ausblick vom höchsten Punkt der Anlage.","tag":"Sonstiges","date": "02. Februar 2021","latlng":{"lat":53.544782841498545,"lng": 8.57045123450451}},
  {"markerId":"popup_1610566573383-225","title":"Flohmarkt","desc":"Schön großer Flohmarkt, bei dem immer wieder tolle Sachen gefunden werden können!!","tag":"Shopping","date": "02. Februar 2021","latlng":{"lat":53.55834113734789,"lng": 8.565584990375184}},
  {"markerId":"popup_1610566573383-226","title":"Das Sparschwein","desc":"Second-Hand-Shop, Das Geschäft ist sehr sauber, übersichtlich, gut soritert und bietet eine große Auswahl an Second-Hand-Bekleidung in guter Qualität an. Außerdem ist das Personal total freundlich!","tag":"Shopping","date": "01. Februar 2021","latlng":{"lat":53.55519374681427,"lng": 8.58320555945041}}
];

if(localStorage.getItem('username') && localStorage.getItem('username') != localStorage.getItem('setDummyDataForUser') && !localStorage.getItem('setDummyDataForUser')){
  dummyMarkers.forEach(function(marker){
    let thisMarker = createMarker(marker.latlng, marker.tag);
  
    thisMarker
    .bindPopup(returnMarkerPopupContent(marker))
    createListEntry(marker);
  });
  localStorage.setItem('setDummyDataForUser', localStorage.getItem('username'));
}

// !SECTION DUMMY DATEN FÜR PROTOTYP


// SECTION SIDEBAR
function updateSidebarUI(item, eventTarget){
  // Allen Menüpunkten die CSS Klasse active entziehen
  document.querySelectorAll('#main-header nav .menu-item').forEach(function(item){
    item.classList.remove('active');
  });

  // Allen Sidebarfenstern die CSS Klasse active entziehen
  document.querySelectorAll('#sidebar .sidebar-item').forEach(function(item){
    item.classList.remove('active');
  });

  if(eventTarget){
    // Dem geklickten Menüpunkt die CSS Klasse aktiv geben
    document.querySelector(eventTarget).classList.add('active');
    // Dem passenden Sidebarfenster die CSS Klasse active geben
    document.querySelector(item).classList.add('active');
  }

  // Wenn Chat Menüpunkt geklickt wurde
  if(item === '#chat'){
    // Gelesene Chat Nachrichten Zähler auf 0 setzen und HTML aktualisieren
    chatMsgCounter = 0;
    chatMsgCounterEl.innerHTML = chatMsgCounter;
    // Chat öffnen
    openChat(localStorage.getItem('username'));
  }

}
// !SECTION SIDEBAR
updateLoadingProgressBar(90);
window.onload = function(){
  updateLoadingProgressBar(100);
  updateLoadingScreen();
}
