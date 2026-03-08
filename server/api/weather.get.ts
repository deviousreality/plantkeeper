// server/api/weather.get.ts
import axios from 'axios';
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
  const config = useRuntimeConfig();
  const { lat, lon, city } = getQuery(event);

  if ((!lat || !lon) && !city) {
    throw createError({
      statusCode: 400,
      message: 'Location parameters are required (lat/lon or city)',
    });
  }

  const apiKey = config.weatherApiKey;

  try {
    let url;
    if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    } else {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;
    }

    const response = await axios.get(url);

    return {
      temperature: response.data.main.temp,
      humidity: response.data.main.humidity,
      conditions: response.data.weather[0].main,
      description: response.data.weather[0].description,
      icon: response.data.weather[0].icon,
      sunrise: response.data.sys.sunrise,
      sunset: response.data.sys.sunset,
    };
  } catch (error) {
    console.error('Error fetching weather data:', error instanceof Error ? error.message : String(error));
    throw createError({
      statusCode: 500,
      message: 'Server error fetching weather data',
    });
  }
});
