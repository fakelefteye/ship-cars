// src/lib/getaround.ts
const GETAROUND_API_URL = "https://api.getaround.com/owner/v1";
const API_TOKEN = process.env.GETAROUND_TOKEN; // Ton token récupéré sur leur portail dev

export async function blockDatesOnGetaround(carId: string, startDate: string, endDate: string) {
  const response = await fetch(`${GETAROUND_API_URL}/cars/${carId}/unavailable_periods`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      unavailable_period: {
        start_date: startDate, // Format ISO8601 exigé par l'API
        end_date: endDate
      }
    })
  });
  return response.json();
}