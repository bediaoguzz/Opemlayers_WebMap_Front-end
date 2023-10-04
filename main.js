const raster = new ol.layer.Tile({
  source: new ol.source.OSM(),
});

const source = new ol.source.Vector();
const vector = new ol.layer.Vector({
  source: source,
  style: {
    "fill-color": "rgba(255, 255, 255, 0.2)",
    "stroke-color": "#ffcc33",
    "stroke-width": 2,
    "circle-radius": 7,
    "circle-fill-color": "#ffcc33",
  },
});

// Limit multi-world panning to one world east and west of the real world.
// Geometry coordinates have to be within that range.
const extent = ol.proj.get("EPSG:3857").getExtent().slice();
extent[0] += extent[0];
extent[2] += extent[2];

const map = new ol.Map({
  layers: [raster, vector],
  target: "map",
  view: new ol.View({
    center: ol.proj.fromLonLat([35.243322, 38.963745]),
    zoom: 6.7,
    extent,
  }),
});

 
// Veritabanından konumları al ve markerları haritaya ekle
fetch(`https://localhost:7131/api/Door`, {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  }
})
.then(response => response.json())
.then(data => {
 data.forEach(item => {
    const lon = item.y;
    const lat = item.x;
    var marker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat]))
       });

    var markerStyle = new ol.style.Style({
        image: new ol.style.Icon({
            src: "images/location-vector-icon2.png",
            scale: 0.06
            })
        });

    marker.setStyle(markerStyle);
    map.addLayer(new ol.layer.Vector({
        source: new ol.source.Vector({
        features: [marker]
        })
    }));
 })
})
.catch(error => console.error('Error fetching data:', error));
 

const modify = new ol.interaction.Modify({ source: source });
map.addInteraction(modify);

let draw, snap; // global so we can remove them later
const typeSelect = document.getElementById("type");
const target = document.getElementById('map');
var sourceFeature = "";

typeSelect.onchange = function () {
  map.removeInteraction(draw);
  map.removeInteraction(snap);
  addInteractions();
};

function addInteractions() {
  const draw = new ol.interaction.Draw({
    source: source,
    type: typeSelect.value,
  });
  map.addInteraction(draw);
  snap = new ol.interaction.Snap({ source: source });
  map.addInteraction(snap);

  // Çizim bitirildiğinde jsPanel'i aç
  draw.on("drawend", function (event) {
    sourceFeature = event.feature;
    const coordinates = event.feature.getGeometry().getCoordinates();
    map.removeInteraction(draw);
    map.removeInteraction(modify);
    // map.removeInteraction(snap);
    const mapContainer = document.getElementById("map");
    mapContainer.style.cursor = "default";
    showAddPanel(coordinates);
  });
}

function changeCursor() {
  const mapContainer = document.getElementById("map");
  mapContainer.style.cursor = "crosshair";
  console.log("Fonksiyona gitti");
}

//ADD POINT
 
document.querySelector(".button1").addEventListener("click", function () {
    addInteractions();
    changeCursor();
    console.log("Butona tiklandi");
});

function showAddPanel(coordinate) {
  const lonLat = ol.proj.toLonLat(coordinate);
  const lat = lonLat[1].toFixed(6);
  const lon = lonLat[0].toFixed(6);

  const panelContent = `
   <div class="panelContent">
   <p>Latitude: ${lat}</p>
   <p>Longitude: ${lon}</p>
   <br>
   <label for="locationName"> Location Name:</label>
   <input type="text" class="saveCancelBtn" id="locationName" placeholder="Enter Location Name">
   <br>
   <br>
   <button id="saveBtn" class="saveCancelBtn">Save</button>
   <button id="cancelBtn" class="saveCancelBtn">Cancel</button>
   </div>
 
    `;

  jsPanel.create({
    headerTitle: "ADD POINT",
    content: panelContent,
    position: "center-top 0 60",
    panelSize: {
      width: () => {
        return Math.min(350, window.innerWidth * 0.9);
      },
      height: () => {
        return Math.min(250, window.innerHeight * 0.6);
      },
    },
    theme: "#218a94",
    borderRadius: "0.5rem",
    headerControls: {
      maximize: "remove",
    },

    callback: function (panel) {
      const saveBtn = document.getElementById("saveBtn");
      saveBtn.addEventListener("click", function () {
        const locationName = document.getElementById("locationName").value;
        const data = {
          X: lat,
          Y: lon,
          Name: locationName,
        };

        // POST isteği yaparak verileri sunucuya gönderme
        fetch('https://localhost:7131/api/Door', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(result => {
          console.log(result); 
          
        })
        .catch(error => console.error('Hata:', error));

        var marker = new ol.Feature({
          geometry: new ol.geom.Point(coordinate),
        });

        var iconStyle = new ol.style.Style({
          image: new ol.style.Icon({
            src: "images/location-vector-icon2.png",
            scale: 0.06,
          }),
        });

        marker.setStyle(iconStyle);
    
        var vectorSource = new ol.source.Vector({
          features: [marker],
        });

        var vectorLayer = new ol.layer.Vector({
          source: vectorSource,
        });

        map.addLayer(vectorLayer);
        panel.close();
      });

      const cancelBtn = document.getElementById("cancelBtn");
      cancelBtn.addEventListener("click", function () {
        source.removeFeature(sourceFeature);
        panel.close();
      });

      document.addEventListener("jspanelcloseduser", function () {
        source.removeFeature(sourceFeature);
      });
    },
  });
}

//QUERY POINT

const queryPoint = document.querySelector(".button2");
queryPoint.addEventListener("click", function () {
  console.log("Butona tiklandi");
  showQueryPanel();
});

function showQueryPanel() {
  fetch("https://localhost:7131/api/Door")
  .then((response) => response.json())
  .then((data) => {
    fillTableWithData(data); // Tabloyu dolduran fonksiyonu çağır
      console.log(data);
  })
 .catch((error) => {
    console.error("API request failed:", error);
 });


  // Tabloyu dolduran fonksiyon
  function fillTableWithData(data) {
    const tableBody = document.querySelector("#data-table tbody");
    tableBody.innerHTML = ""; // Mevcut tabloyu temizle

    const tableRows = data.map((item) => {
      return `
      <tr>
        <td>${item.id}</td>
        <td>${item.name}</td>
        <td>${item.x}</td>
        <td>${item.y}</td>
        <td><Button id="deleteBtn" onclick="deletePoint(${item.id})" style="background-color:#f2efe9; color:#218a94; display:flex; justify-content:center; align-items:center; padding:5px; border:2px solid #218a94; cursor:pointer; border-radius:0.5rem;">
        <ion-icon size="large" name="trash-outline"></ion-icon></Button></td>
        <td><Button id="updateBtn" onclick="updatePoint('${item.name}', '${item.x}','${item.y}','${item.id}')" style="background-color:#f2efe9; color:#218a94; display:flex; justify-content:center; align-items:center; padding:5px; border:2px solid #218a94; cursor:pointer; border-radius:0.5rem;">
        <ion-icon size="large" name="sync-outline"></ion-icon></Button></td>
      </tr>
    `;
    });

    tableBody.innerHTML = tableRows.join("");
  }

  const panelContent = `
  <div class="panelContent">
  <table id="data-table" class="display" style="width:100%; z-index=40;">
  <thead>
      <tr>
          <th>Id</th>
          <th>Name</th>
          <th>Latitude</th>
          <th>Longitude</th>
      </tr>
  </thead>
  <tbody>

  </tbody>
</table>
  </div>
    `;

  jsPanel.create({
    headerTitle: "QUERY POINT",
    content: panelContent,
    position: "center-top 0 60",
    panelSize: {
      width: () => {
        return Math.min(650, window.innerWidth * 0.9);
      },
      height: () => {
        return Math.min(500, window.innerHeight * 0.6);
      },
    },
    theme: "#218a94",
    borderRadius: "0.5rem",
    headerControls: {
      maximize: "remove",
    },
    callback: function () {
      $("#data-table").DataTable();
    },
  });
}

function deletePoint(id) {

  fetch(`https://localhost:7131/api/Door/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    }
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
    })
    .catch((error) => {
      console.error("Hata oluştu:", error);
      alert("Bir hata oluştu, silme işlemi yapılamadı!");
    });
}


function updatePoint(name, x, y, id){

  const panelContent = `
  <div class="panelContent">
  <label for="x">Latitude:</label><br>
  <input type="text" class="saveCancelBtn" id="x"><br><br>
  <label for="y">Longitude:</label><br>
  <input type="text" class="saveCancelBtn" id="y"><br><br>
  <label for="name">Location Name:</label><br>
  <input type="text" class="saveCancelBtn" id="name"><br><br>
  <button id="saveBtn" class="saveCancelBtn">Save</button>
  <button id="cancelBtn" class="saveCancelBtn">Cancel</button>
  <button id="editBtn" class="saveCancelBtn">Edit on Map</button>
  </div>

   `;

  jsPanel.create({
    headerTitle: "UPDATE POINT",
    content: panelContent,
    position: "center-top 390 90",
    panelSize: {
      width: () => {
        return Math.min(400, window.innerWidth * 0.6);
      },
      height: () => {
        return Math.min(380, window.innerHeight * 0.6);
      },
    },
    theme: "#218a94",
    borderRadius: "0.5rem",
    headerControls: {
      maximize: "remove",
    },
    callback:function(panel){
      const xInput = document.getElementById("x");
      const yInput = document.getElementById("y");
      const nameInput = document.getElementById("name");
      const saveBtn = document.getElementById("saveBtn");
      const cancelBtn = document.getElementById("cancelBtn");
      const editBtn = document.getElementById("editBtn");

      xInput.value = x;
      yInput.value = y;
      nameInput.value = name; 
      
        
      saveBtn.addEventListener("click", () => {
        const newX =xInput.value ;
        const newY = yInput.value;
        const newName =nameInput.value;
        console.log(newX);
        console.log(newY);
        console.log(newName);    
         
        // Güncellenecek veriler
        const updatedData = {
           id: id,
           name: newName,
           x: newX,
           y: newY,
        };
 
         fetch("https://localhost:7131/api/Door", {
             method: "PUT", 
             headers: {
               "Content-Type": "application/json",
             },
             body: JSON.stringify(updatedData),
           })

           panel.close();
      });

      cancelBtn.addEventListener("click", () => {
        panel.close();
      });


      editBtn.addEventListener('click', function(){
        
        var xValue = x;
        var yValue = y;
        console.log(x);
        var marker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([ xValue,yValue ]))
        });
        var modify = new ol.interaction.Modify({
          features: new ol.Collection([marker]),
        });
        map.addInteraction(modify);
        modify.on('modifyend', function (event) {
          var modifiedFeature = event.features.getArray()[0];
          var newCoordinates = modifiedFeature.getGeometry().getCoordinates();
          var lonLat = ol.proj.toLonLat(newCoordinates); 
          var lat = lonLat[0].toFixed(6);
          var lon = lonLat[1].toFixed(6);
          
          const editOnMap = {
            id: id,
            name: name,
            x: lat,
            y: lon,
         };
        
         fetch("https://localhost:7131/api/Door", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(editOnMap)
         })
         .then(response => response.json())
         .then(data => {
            console.log('Güncellenen veri:', data);
            
         })
         .catch(error => {
            console.error('Hata:', error);
            
         });
          console.log('Yeni Koordinat:', newCoordinates);
          var marker = new ol.Feature({
            geometry: new ol.geom.Point(newCoordinates),
          });
          

          var iconStyle = new ol.style.Style({
            image: new ol.style.Icon({
              src: "images/location-vector-icon2.png",
            scale: 0.06,
            }),
          });

          marker.setStyle(iconStyle);

          var vectorSource = new ol.source.Vector({
             features: [marker],
          });

          var vectorLayer = new ol.layer.Vector({
            source: vectorSource,
          });

          map.addLayer(vectorLayer);
          map.removeInteraction(modify);
          panel.close();

          const updatedPanelContent = `<div class="panelContent">
          <label for="x">Latitude:</label><br>
          <input type="text" class="saveCancelBtn" id="x"><br><br>
          <label for="y">Longitude:</label><br>
          <input type="text" class="saveCancelBtn" id="y"><br><br>
          <label for="name">Location Name:</label><br>
          <input type="text" class="saveCancelBtn" id="name"><br><br>
          <button id="saveBtn" class="saveCancelBtn">Save</button>
          <button id="cancelBtn" class="saveCancelBtn">Cancel</button>
          </div> `;

          jsPanel.create({
               headerTitle: "UPDATE POINT",
               content: updatedPanelContent,
               position: "center-top 390 90",
               panelSize: {
                    width: () => {
                        return Math.min(400, window.innerWidth * 0.6);
                    },
                    height: () => {
                        return Math.min(380, window.innerHeight * 0.6);
                   },
                },
               theme: "#218a94",
               borderRadius: "0.5rem",
               headerControls: {
                 maximize: "remove",
                },
                callback:function(updatedPanel){
                  const newXInput = document.getElementById("x");
                  const newYInput = document.getElementById("y");
                  const newNameInput = document.getElementById("name");
                  const saveBtn = document.getElementById("saveBtn");
                  const cancelBtn = document.getElementById("cancelBtn");

                 // Güncellenmiş koordinatları ve diğer bilgileri doldurun
                 newXInput.value = lat;
                 newYInput.value = lon;
                 newNameInput.value = name;
                    
                 saveBtn.addEventListener("click", () => {
                    const newX = newXInput.value;
                    const newY = newYInput.value;
                    const newName = newNameInput.value;
                    
                    // Güncellenecek verileri oluşturun
                    const updatedData = {
                      id: id,
                      name: newName,
                      x: newX,
                      y: newY,
                    };
             
                     fetch("https://localhost:7131/api/Door", {
                         method: "PUT", 
                         headers: {
                           "Content-Type": "application/json",
                         },
                         body: JSON.stringify(updatedData),
                       })
            
                       updatedPanel.close();
                  });
            
                  cancelBtn.addEventListener("click", () => {
                    updatedPanel.close();
                  });
                  
                }

          });

        });
       
      });
      
    }
    
  });

}

var button = document.querySelector(".buttonicon");
var nav = document.querySelector(".navbar");

button.addEventListener("click", function () {
  if (nav.style.transform == "translateY(0px)") {
    nav.style.transform = "translateY(-200px)";
  } else {
    nav.style.transform = "translateY(0px)";
  }
});
