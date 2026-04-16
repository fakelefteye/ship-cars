// src/lib/getaround-api.ts
const GETAROUND_API_KEY = import.meta.env.GETAROUND_API_KEY;

// Fonction pour récupérer vos réservations Getaround
export async function fetchGetaroundRentals() {
  try {
    const response = await fetch('https://fr.getaround.com/api/owner/v1/rentals', {
      headers: {
        'Authorization': `Bearer ${GETAROUND_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  } catch (error) {
    console.error("Erreur API Getaround:", error);
    return null;
  }
}

// Fonction pour envoyer un message automatique
export async function sendGetaroundMessage(rentalId: string, text: string) {
  await fetch(`https://fr.getaround.com/api/owner/v1/rentals/${rentalId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GETAROUND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: { body: text } })
  });
}