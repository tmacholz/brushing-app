interface GenerateNameAudioResult {
  audioUrl: string;
  name: string;
}

/**
 * Generate TTS audio for a child's name and store it in Vercel Blob.
 * Returns the permanent URL to the audio file.
 */
export async function generateChildNameAudio(
  childId: string,
  name: string
): Promise<GenerateNameAudioResult | null> {
  try {
    const response = await fetch('/api/generate-name-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        type: 'child',
        id: childId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to generate child name audio:', error);
      return null;
    }

    const data = await response.json();
    return {
      audioUrl: data.audioUrl,
      name: data.name,
    };
  } catch (error) {
    console.error('Error generating child name audio:', error);
    return null;
  }
}

/**
 * Generate TTS audio for a pet's name and store it in Vercel Blob.
 * This is typically called once per pet during admin setup,
 * since pet names are static.
 */
export async function generatePetNameAudio(
  petId: string,
  name: string
): Promise<GenerateNameAudioResult | null> {
  try {
    const response = await fetch('/api/generate-name-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        type: 'pet',
        id: petId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to generate pet name audio:', error);
      return null;
    }

    const data = await response.json();
    return {
      audioUrl: data.audioUrl,
      name: data.name,
    };
  } catch (error) {
    console.error('Error generating pet name audio:', error);
    return null;
  }
}
