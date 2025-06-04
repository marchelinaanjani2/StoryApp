import Map from '../utils/map';

const isValidCoordinate = (value) => typeof value === 'number' && !isNaN(value);

export async function storyMapper(story) {
  const lat = story.lat;
  const lon = story.lon;

  let placeName = 'Unknown location'; // default jika lat/lon null/invalid

  if (isValidCoordinate(lat) && isValidCoordinate(lon)) {
    try {
      placeName = await Map.getPlaceNameByCoordinate(lat, lon);
    } catch (error) {
      console.error('Failed to get place name:', error);
    }
  }

  return {
    ...story,
    location: {
      lat,
      lon,
      placeName,
    },
  };
}
