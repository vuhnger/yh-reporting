import type { IndoorClimateWeatherHour, IndoorClimateWeatherSnapshot } from "./schema";

export interface DailyWeatherRow {
  date: string;
  weatherEmoji: string;
  weatherDescription: string;
  avgTempC: number | null;
  minTempC: number | null;
  maxTempC: number | null;
  avgRelativeHumidity: number | null;
  precipitationMm: number | null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function roundOne(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value * 10) / 10;
}

export function filterWeatherHourlyRows(
  snapshot: IndoorClimateWeatherSnapshot,
  hourFrom: number,
  hourTo: number,
): IndoorClimateWeatherHour[] {
  const from = Math.min(23, Math.max(0, hourFrom));
  const to = Math.min(23, Math.max(from, hourTo));
  return snapshot.hourly.filter((row) => row.hour >= from && row.hour <= to);
}

export function buildDailyWeatherRows(hourlyRows: IndoorClimateWeatherHour[]): DailyWeatherRow[] {
  const byDate = new Map<string, IndoorClimateWeatherHour[]>();

  for (const row of hourlyRows) {
    const rows = byDate.get(row.date);
    if (rows) {
      rows.push(row);
    } else {
      byDate.set(row.date, [row]);
    }
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, rows]) => {
      const temperatures = rows
        .map((row) => row.temperatureC)
        .filter((value): value is number => value !== null);
      const humidities = rows
        .map((row) => row.relativeHumidity)
        .filter((value): value is number => value !== null);
      const precipitation = rows
        .map((row) => row.precipitationMm)
        .filter((value): value is number => value !== null);
      const firstWeatherRow = rows.find((row) => row.weatherDescription || row.weatherEmoji) ?? rows[0];

      return {
        date,
        weatherEmoji: firstWeatherRow?.weatherEmoji ?? "",
        weatherDescription: firstWeatherRow?.weatherDescription ?? "-",
        avgTempC: roundOne(average(temperatures)),
        minTempC: temperatures.length > 0 ? Math.min(...temperatures) : null,
        maxTempC: temperatures.length > 0 ? Math.max(...temperatures) : null,
        avgRelativeHumidity: roundOne(average(humidities)),
        precipitationMm:
          precipitation.length > 0
            ? roundOne(precipitation.reduce((sum, value) => sum + value, 0))
            : null,
      };
    });
}
