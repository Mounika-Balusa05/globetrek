
export default function handler(req, res) {
  res.status(200).json({
    WEATHER_API_KEY: process.env.WEATHER_API_KEY,
    UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY,    
  });
}