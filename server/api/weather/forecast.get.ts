// server/api/weather/forecast.get.ts
import axios from 'axios';
import { db } from '~/server/utils/db';
import { requireAuth } from '~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAuth(db, event);
  const query = getQuery(event);
  const city = query.city?.toString();

  if (!city) {
    throw createError({
      statusCode: 400,
      statusMessage: 'City parameter is required.',
    });
  }

  const config = useRuntimeConfig();
  const apiKey = config.weatherApiKey;

  try {
    // Call OpenWeatherMap 5-day forecast API
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
    );

    // Process the forecast data to get one entry per day (at noon)
    const forecastData = response.data;
    const processedForecast = [];

    // Get forecasts at around noon for each day
    const dailyForecasts = {};

    forecastData.list.forEach((item) => {
      const date = item.dt_txt.split(' ')[0]; // Get date part only
      const hour = parseInt(item.dt_txt.split(' ')[1].split(':')[0]);

      // Try to get forecasts close to noon
      if (!dailyForecasts[date] || Math.abs(hour - 12) < Math.abs(dailyForecasts[date].hour - 12)) {
        dailyForecasts[date] = {
          hour: hour,
          forecast: {
            date: item.dt_txt,
            temp: Math.round(item.main.temp),
            min: Math.round(item.main.temp_min),
            max: Math.round(item.main.temp_max),
            description: item.weather[0].description,
            icon: item.weather[0].icon,
            humidity: item.main.humidity,
            windSpeed: item.wind.speed,
          },
        };
      }
    });

    // Convert to array and take first 5 days
    Object.values(dailyForecasts).forEach((item) => {
      processedForecast.push(item.forecast);
    });

    return processedForecast.slice(0, 5); // Limit to 5 days
  } catch (error) {
    console.error('Error fetching weather forecast:', error instanceof Error ? error.message : String(error));
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: error.response?.data?.message || 'Failed to fetch weather forecast.',
    });
  }
});
