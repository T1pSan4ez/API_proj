const apiKey = 'af1c606cbebbc22a9abbe08a5abb2f6d';

document.getElementById('weather-button').addEventListener('click', async function () {
    const fromCity = document.getElementById('from-city').value;
    const toCity = document.getElementById('to-city').value;
    const startDate = new Date(document.getElementById('date-trip').value).getTime() / 1000;

    let errorDate = document.getElementById('error-date');
    let errorFromCity = document.getElementById('error-city-from');
    let errorToCity = document.getElementById('error-city-to');
    let errorBorderDate = document.getElementById('date-trip');
    let errorBorderFromCity = document.getElementById('from-city');
    let errorBorderToCity = document.getElementById('to-city');

    errorDate.style.display = 'none';
    errorFromCity.style.display = 'none';
    errorToCity.style.display = 'none';

    let hasError = false;

    if (!startDate) {
        errorDate.style.display = 'block';
        errorBorderDate.classList.add('error-border');
        hasError = true;
    }

    if (!fromCity) {
        errorFromCity.style.display = 'block';
        errorBorderFromCity.classList.add('error-border');
        hasError = true;
    }

    if (!toCity) {
        errorToCity.style.display = 'block';
        errorBorderToCity.classList.add('error-border');
        hasError = true;
    }

    if (hasError) {
        return;
    }

    async function fetchWeather(city, idWeatherTittle, idWeather) {
        const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            console.log(data);

            const forecast = data.list.filter((day, index) => day.dt >= startDate && index % 8 === 0);

            let forecastHtmlTittle = `<h2>Прогноз погоды для: <strong>${city}</strong></h2>`;
            let forecastHtml = ``;

            forecast.forEach(day => {
                const date = new Date(day.dt * 1000).toLocaleDateString();
                const iconUrl = `https://openweathermap.org/img/wn/${day.weather[0].icon}.png`;

                forecastHtml +=
                    `<div id="days-weather">
                        <p>${date}</p>
                        <hr>
                        <p>${day.main.temp}°C</p>
                        <p><img src="${iconUrl}" alt="Weather icon"></p> 
                    </div>`;
            });

            document.getElementById(idWeatherTittle).innerHTML = forecastHtmlTittle;
            document.getElementById(idWeather).innerHTML = forecastHtml;
        } catch (error) {
            console.error('Error fetching the weather data', error);
            document.getElementById(idWeather).innerText = 'Error fetching the weather data';
        }
    }

    await fetchWeather(fromCity, 'weatherTitleFrom', 'weatherFrom');
    await fetchWeather(toCity, 'weatherTitleTo', 'weatherTo');
});
