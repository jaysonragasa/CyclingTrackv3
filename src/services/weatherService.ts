import { SegmentWeather } from '../types/cycling';

export async function fetchLiveWeather(lat: number, lng: number, title = 'Current Segment'): Promise<SegmentWeather | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m,precipitation,weather_code&daily=weather_code,temperature_2m_max,wind_speed_10m_max,precipitation_probability_max&timezone=auto`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API status: ${res.status}`);

    const data = await res.json();
    const current = data.current;
    if (!current) return null;

    const tempC = Math.round(current.temperature_2m);
    const tempF = Math.round((tempC * 9) / 5 + 32);
    const windSpeedKmh = Math.round(current.wind_speed_10m);
    const windDirectionDeg = current.wind_direction_10m || 0;
    const precipChance = data.daily?.precipitation_probability_max?.[0] || 0;

    // Convert degrees to cardinal direction
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const cardinal = directions[Math.round(windDirectionDeg / 22.5) % 16];

    // Weather condition text & icon from WMO code
    const weatherCode = current.weather_code || 0;
    let conditions = 'Clear Sky';
    let icon: SegmentWeather['icon'] = 'sun';

    if (weatherCode >= 80) {
      conditions = 'Rain Showers';
      icon = 'rain';
    } else if (weatherCode >= 61) {
      conditions = 'Steady Rain';
      icon = 'rain';
    } else if (weatherCode >= 51) {
      conditions = 'Light Drizzle';
      icon = 'rain';
    } else if (weatherCode >= 3) {
      conditions = 'Overcast';
      icon = 'cloud';
    } else if (weatherCode >= 1) {
      conditions = 'Partly Cloudy';
      icon = 'cloud';
    }

    if (windSpeedKmh >= 35) {
      icon = 'wind';
    }

    let severeAlert: string | undefined = undefined;
    if (windSpeedKmh >= 40) {
      severeAlert = `High Crosswind Warning: Gusts exceeding ${windSpeedKmh} km/h from ${cardinal}. Deep section wheels not recommended.`;
    } else if (precipChance >= 75) {
      severeAlert = `Heavy Precipitation Advisory: Rain chance ${precipChance}%. Slick bike lanes expected.`;
    }

    return {
      dayNumber: 1,
      segmentTitle: title,
      tempC,
      tempF,
      conditions,
      icon,
      windSpeedKmh,
      windDirection: `${cardinal} ${windSpeedKmh} km/h`,
      precipitationChance: precipChance,
      severeAlert
    };
  } catch (err) {
    console.warn('Live weather service error:', err);
    return null;
  }
}
