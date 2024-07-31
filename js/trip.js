const leaflet = L;

let map = leaflet.map('map').setView([48.505, 33.09], 6);

leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

async function reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data && data.address) {
        document.getElementById('from-city').value = data.address.city || data.address.town || data.address.village;
    } else {
        alert('Город не найден');
    }
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);

    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
}

function setCookie(name, value, days) {
    let expires = "";

    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }

    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

const savedLat = getCookie('latitude');
const savedLng = getCookie('longitude');

document.addEventListener("DOMContentLoaded", function () {
    if (savedLat && savedLng) {
        leaflet.marker([savedLat, savedLng]).addTo(map)
            .bindPopup('Вы тут!')
            .openPopup();
        map.setView([savedLat, savedLng], 9);

        reverseGeocode(savedLat, savedLng);
    } else {
        if (confirm("Вы даете согласие на геолокацию?")) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (position) {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;

                    setCookie('latitude', lat, 7);
                    setCookie('longitude', lon, 7);

                    map.setView([lat, lon], 9);

                    leaflet.marker([lat, lon]).addTo(map)
                        .bindPopup('Вы тут!')
                        .openPopup();
                }, function (error) {
                    console.error('Ошибка получения координат:', error);
                });
            } else {
                alert('Геолокация не поддерживается.');
            }
        }
    }
});

async function getCoordinates(city) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${city}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data && data.length > 0) {
        const lat = data[0].lat;
        const lon = data[0].lon;
        return leaflet.latLng(lat, lon);
    } else {
        alert(`Город ${city} не найден`);
        throw new Error(`Город не найден`);
    }

}

let globalDistance = 0;
let globalCityFrom = '';
let globalCityTo = '';
let globalTotalCost = 0;
let globalTime = 0;

async function addRouting() {
    map.eachLayer(function (layer) {
        if (!layer._url) {
            map.removeLayer(layer);
        }
    });

    const cityA = document.getElementById('from-city').value;
    const cityB = document.getElementById('to-city').value;
    const startDate = document.getElementById('date-trip').value;

    globalCityFrom = cityA;
    globalCityTo = cityB;

    const errorDate = document.getElementById('error-date');
    const errorFromCity = document.getElementById('error-city-from');
    const errorToCity = document.getElementById('error-city-to');
    const errorBorderDate = document.getElementById('date-trip');
    const errorBorderFromCity = document.getElementById('from-city');
    const errorBorderToCity = document.getElementById('to-city');

    let hasError = false;
    if (!startDate) {
        errorDate.style.display = 'block';
        errorBorderDate.classList.add('error-border');
        hasError = true;
    }

    if (!cityA) {
        errorFromCity.style.display = 'block';
        errorBorderFromCity.classList.add('error-border');
        hasError = true;
    }

    if (!cityB) {
        errorToCity.style.display = 'block';
        errorBorderToCity.classList.add('error-border');
        hasError = true;
    }

    if (hasError) {
        return;
    }

    try {
        const pointA = await getCoordinates(cityA);
        const pointB = await getCoordinates(cityB);

        const routingControl = leaflet.Routing.control({
            waypoints: [pointA, pointB], routeWhileDragging: true, geocoder: leaflet.Control.Geocoder.nominatim()
        }).addTo(map);

        routingControl.on('routesfound', function (event) {
            const routes = event.routes;
            const summary = routes[0].summary;
            const distance = summary.totalDistance / 1000;
            const time = summary.totalTime / 3600;

            globalDistance = distance.toFixed(2);
            globalTime = time.toFixed(2);
        });
    } catch (error) {
        console.error('Не удалось получить координаты:', error);
    }
}

async function findMapObject(cityUrl, objectMarker, nodeType, typeObject, type) {
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityUrl)}`;

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.length > 0) {
        const lat = data[0].lat;
        const lon = data[0].lon;
        map.setView([lat, lon], 13);

        const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node["${nodeType}"="${typeObject}"](around:10000,${lat},${lon});out body;`;

        const overpassResponse = await fetch(overpassUrl);
        const overpassData = await overpassResponse.json();

        overpassData.elements.forEach(element => {
            if (element.type === 'node') {
                leaflet.marker([element.lat, element.lon], {icon: objectMarker})
                    .addTo(map)
                    .bindPopup(element.tags.name || `${type}`);
            }
        });
    } else {
        alert('Введите правильное название города');
    }
}

const findHotel = document.getElementById('find-hotels');
const findRestaurant = document.getElementById('find-restaurant');
const findParks = document.getElementById('find-parks');
const findMonument = document.getElementById('find-monument');

findHotel.addEventListener('click', () => {
    const city = document.getElementById('to-city').value;

    const hotelIcon = leaflet.icon({
        iconUrl: 'images/purpleMarker.png', iconSize: [34, 34], iconAnchor: [10, 34], popupAnchor: [0, -34]
    });

    const nodeType = 'tourism';
    const typeObject = 'hotel';
    const type = 'Hotel';

    findMapObject(city, hotelIcon, nodeType, typeObject, type);
});

findRestaurant.addEventListener('click', () => {
    const city = document.getElementById('to-city').value;

    const redIcon = leaflet.icon({
        iconUrl: 'images/redMarker.png', iconSize: [21, 34], iconAnchor: [10, 34], popupAnchor: [0, -34]
    });

    const nodeType = 'amenity';
    const typeObject = 'restaurant';
    const type = 'Restaurant';

    findMapObject(city, redIcon, nodeType, typeObject, type);
});

findParks.addEventListener('click', () => {
    const city = document.getElementById('to-city').value;

    const greenIcon = leaflet.icon({
        iconUrl: 'images/greenMarker.png', iconSize: [21, 34], iconAnchor: [10, 34], popupAnchor: [0, -34]
    });

    const nodeType = 'leisure';
    const typeObject = 'park';
    const type = 'Park';

    findMapObject(city, greenIcon, nodeType, typeObject, type);
});

findMonument.addEventListener('click', () => {
    const city = document.getElementById('to-city').value;

    const blackIcon = leaflet.icon({
        iconUrl: 'images/blackMarker.png', iconSize: [21, 34], iconAnchor: [10, 34], popupAnchor: [0, -34]
    });

    const nodeType = 'historic';
    const typeObject = 'monument';
    const type = 'Monument';

    findMapObject(city, blackIcon, nodeType, typeObject, type);
});

function calculateTotal() {
    const transportForm = document.forms['transport'];
    const peopleForm = document.forms['people'];

    let transportCost = 0;
    let peopleCost = 0;

    for (let i = 0; i < transportForm.elements['transport'].length; i++) {
        if (transportForm.elements['transport'][i].checked) {
            transportCost = parseFloat(transportForm.elements['transport'][i].value);
            break;
        }
    }

    for (let i = 0; i < peopleForm.elements['people'].length; i++) {
        if (peopleForm.elements['people'][i].checked) {
            peopleCost = parseFloat(peopleForm.elements['people'][i].value);
            break;
        }
    }

    const price = 600;


    globalTotalCost = price + transportCost + peopleCost;
    // document.getElementById('total-price').innerText = `Общая стоимость: ${totalCost} UAH`;
}

document.getElementById('transport').addEventListener('change', calculateTotal);
document.getElementById('people').addEventListener('change', calculateTotal);

let globalTransport = '';
let globalPeople = '';

function getSelectedTransport() {
    const selectedRadioTransport = document.querySelector('input[name="transport"]:checked');

    if (selectedRadioTransport) {
        switch (selectedRadioTransport.id) {
            case 'bus':
                globalTransport = 'Автобус';
                break;
            case 'auto':
                globalTransport = 'Легковая машина';
                break;
            case 'busik':
                globalTransport = 'Микроавтобус';
                break;
            default:
                globalTransport = 'Неизвестно';
        }
    }
}

function getSelectedPeople() {
    const selectedRadioPeople = document.querySelector('input[name="people"]:checked');

    if (selectedRadioPeople) {
        switch (selectedRadioPeople.id) {
            case 'solo':
                globalPeople = 'Один';
                break;
            case 'family':
                globalPeople = 'Семья';
                break;
            case 'couple':
                globalPeople = 'Пара';
                break;
            case 'group':
                globalPeople = 'Группа';
                break;
            default:
                globalPeople = 'Неизвестно';
        }
    }
}

function saveTripData(cityA, cityB, distance, price, time, vehicle, people) {
    const dateTrip = document.getElementById('date-trip').value;
    let trips = localStorage.getItem('trips');

    function generateRandomNumber() {
        return Math.floor(10000000 + Math.random() * 90000000);
    }

    const randomID = generateRandomNumber();

    if (trips) {
        trips = JSON.parse(trips);
    } else {
        trips = [];
    }

    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const systemTime = `${hours}:${minutes}:${seconds}`;

    const newTrip = {
        id: randomID,
        date: dateTrip,
        fromCity: cityA,
        toCity: cityB,
        distance: distance,
        price: price,
        time: time,
        vehicle: vehicle,
        people: people,
        systemTime: systemTime
    };

    trips.push(newTrip);
    localStorage.setItem('trips', JSON.stringify(trips));

    displayTrips();
}

function displayTrips() {
    const tripsContainer = document.getElementById('trip-forms');
    tripsContainer.innerHTML = '';

    let trips = localStorage.getItem('trips');

    if (trips) {
        trips = JSON.parse(trips);
        trips.forEach((trip, index) => {
            const tripDiv = document.createElement('div');

            tripDiv.className = 'swiper-slide';
            tripDiv.innerHTML = `<div class="trip-form-decor">
                                 <p><b>ID:</b> ${trip.id}</p>
                                 <p><b>Дата:</b> ${trip.date} </p>
                                 <p><b>Создано в:</b> ${trip.systemTime}</p>
                                 <p><b>От:</b> ${trip.fromCity}</p>
                                 <p><b>К:</b> ${trip.toCity}</p>
                                 <p><b>Расстояние:</b> ${trip.distance} КМ</p>
                                 <p><b>Цена:</b> ${trip.price} UAH</p>
                                 <p><b>Время:</b> ${trip.time} ч</p>
                                 <p><b>Транспорт:</b> ${trip.vehicle}</p>
                                 <p><b>Пассажиры:</b> ${trip.people}</p>
                                 <p><b>Контакт:</b> +380990435156</p>
                                 <button onclick="addToFavorites(${index})" class="favorite-button">В избранное</button>
                                 <button onclick="deleteTrip(${index})" class="delete-button">Удалить</button>
                                 </div>`;
            tripsContainer.appendChild(tripDiv);
        });
        swiper.update();
    }
}

const tripsPerPage = 3;
let currentPage = 1;

function addToFavorites(index) {
    let trips = localStorage.getItem('trips');

    if (trips) {
        trips = JSON.parse(trips);

        let favoriteTrips = localStorage.getItem('favoriteTrips');

        if (favoriteTrips) {
            favoriteTrips = JSON.parse(favoriteTrips);
        } else {
            favoriteTrips = [];
        }

        const newTrip = trips[index];
        const duplicate = favoriteTrips.some(trip =>
            trip.id === newTrip.id &&
            trip.date === newTrip.date &&
            trip.fromCity === newTrip.fromCity &&
            trip.toCity === newTrip.toCity &&
            trip.distance === newTrip.distance &&
            trip.price === newTrip.price &&
            trip.time === newTrip.time &&
            trip.vehicle === newTrip.vehicle &&
            trip.people === newTrip.people
        );

        if (duplicate) {
            alert('Эта поездка уже добавлена в избранное.');
        } else {
            favoriteTrips.push(newTrip);
            localStorage.setItem('favoriteTrips', JSON.stringify(favoriteTrips));
            displayFavorites();
        }
    }
}

function displayFavorites(page = 1) {
    currentPage = page;
    const favoriteTripsContainer = document.getElementById('favorite-trips');
    favoriteTripsContainer.innerHTML = '';

    let favoriteTrips = localStorage.getItem('favoriteTrips');

    if (favoriteTrips) {
        favoriteTrips = JSON.parse(favoriteTrips);

        const start = (page - 1) * tripsPerPage;
        const end = start + tripsPerPage;
        const paginatedTrips = favoriteTrips.slice(start, end);

        paginatedTrips.forEach((trip, index) => {
            const tripDiv = document.createElement('div');
            tripDiv.className = 'trip-form-decor';
            tripDiv.innerHTML = `
                                 <p><b>ID:</b> ${trip.id}</p>
                                 <p><b>Дата:</b> ${trip.date}</p>
                                 <p><b>Создано в:</b> ${trip.systemTime}</p>
                                 <p><b>От:</b> ${trip.fromCity}</p>
                                 <p><b>К:</b> ${trip.toCity}</p>
                                 <p><b>Расстояние:</b> ${trip.distance} КМ</p>
                                 <p><b>Цена:</b> ${trip.price} UAH</p>
                                 <p><b>Время:</b> ${trip.time} ч</p>
                                 <p><b>Транспорт:</b> ${trip.vehicle}</p>
                                 <p><b>Пассажиры:</b> ${trip.people}</p>
                                 <p><b>Контакт:</b> +380990435156</p>
                                 <button onclick="removeFromFavorites(${index + start})" class="delete-button">Удалить из избранного</button>`;

            favoriteTripsContainer.appendChild(tripDiv);
        });
        displayPagination(favoriteTrips.length);
    }
}

function displayPagination(totalTrips) {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';

    const totalPages = Math.ceil(totalTrips / tripsPerPage);
    const maxPagesToShow = 4;

    function createPageButton(page) {
        const pageButton = document.createElement('button');
        pageButton.innerText = page;
        pageButton.className = 'pagination-button';
        if (page === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.onclick = () => displayFavorites(page);
        paginationContainer.appendChild(pageButton);
    }

    if (totalPages <= maxPagesToShow) {
        for (let i = 1; i <= totalPages; i++) {
            createPageButton(i);
        }
    } else {
        createPageButton(1);
        if (currentPage > 3) {
            const ellipsis = document.createElement('span');
            ellipsis.innerText = '...';
            paginationContainer.appendChild(ellipsis);
        }

        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPages - 1, currentPage + 1);

        if (currentPage <= 3) {
            endPage = 4;
        }

        if (currentPage >= totalPages - 2) {
            startPage = totalPages - 3;
        }

        for (let i = startPage; i <= endPage; i++) {
            createPageButton(i);
        }

        if (currentPage < totalPages - 2) {
            const ellipsis = document.createElement('span');
            ellipsis.innerText = '...';
            paginationContainer.appendChild(ellipsis);
        }
        createPageButton(totalPages);
    }
}

document.addEventListener('DOMContentLoaded', () => displayFavorites());

function removeFromFavorites(index) {
    let favoriteTrips = localStorage.getItem('favoriteTrips');

    if (favoriteTrips) {
        favoriteTrips = JSON.parse(favoriteTrips);
        favoriteTrips.splice(index, 1);
        localStorage.setItem('favoriteTrips', JSON.stringify(favoriteTrips));
        displayFavorites();
    }
}

document.addEventListener('DOMContentLoaded', function () {
    displayTrips();
    displayFavorites();

    const modal = document.getElementById('favoriteModal');
    const btn = document.getElementById('favoriteButton');
    const span = document.getElementsByClassName('close')[0];

    btn.onclick = function () {
        modal.style.display = 'block';
    }

    span.onclick = function () {
        modal.style.display = 'none';
    }

    window.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
});

function deleteTrip(index) {
    let trips = localStorage.getItem('trips');

    if (trips) {
        trips = JSON.parse(trips);
        trips.splice(index, 1);
        localStorage.setItem('trips', JSON.stringify(trips));
        displayTrips();
    }
}

const generateButton = document.getElementById('generate-trip');

generateButton.addEventListener('click', function () {
    const selectedTransport = document.querySelector('input[name="transport"]:checked');
    const selectedPeople = document.querySelector('input[name="people"]:checked');

    if (!selectedTransport || !selectedPeople) {
        alert('Пожалуйста, выберите транспорт и количество людей.');
        return;
    }

    if (globalCityFrom && globalCityTo && parseFloat(globalDistance) > 0 && parseFloat(globalTime) > 0) {
        saveTripData(globalCityFrom, globalCityTo, globalDistance, globalTotalCost, globalTime, globalTransport, globalPeople);
    } else {
        alert('Маршрут не проложен. Пожалуйста, проложите маршрут перед сохранением поездки.');
    }
})

document.addEventListener('DOMContentLoaded', displayTrips);

const swiper = new Swiper('.swiper-container', {
    slidesPerView: 3, spaceBetween: 30, freeMode: true, pagination: {
        el: '.swiper-pagination', clickable: true,
    },
});

document.getElementById('date-trip').addEventListener('input', function () {
    document.getElementById('error-date').style.display = 'none';
    document.getElementById('date-trip').classList.remove('error-border');
});

document.getElementById('from-city').addEventListener('input', function () {
    document.getElementById('error-city-from').style.display = 'none';
    document.getElementById('from-city').classList.remove('error-border');
});

document.getElementById('to-city').addEventListener('input', function () {
    document.getElementById('error-city-to').style.display = 'none';
    document.getElementById('to-city').classList.remove('error-border');
});

document.getElementById('date-trip').addEventListener('keydown', function (event) {
    event.preventDefault();
});