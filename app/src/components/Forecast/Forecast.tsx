"use client";

import { useState } from "react";

// Define a TypeScript type for the forecast item
type ForecastItem = {
  date: string;
  temperatureC: number;
  summary: string;
};

const Forecast: React.FC = () => {
  const [forecastData, setForecastData] = useState<ForecastItem[]>([]);

  const fetchData = async () => {
    try {
      const response = await fetch("./api/forecast");
      const data = await response.json();
      setForecastData(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  return (
    <div>
      <h1>Weather Forecast</h1>
      <ul>
        {forecastData.map((item) => (
          <li key={item.date}>
            Date: {item.date}, Temperature: {item.temperatureC}°C, Summary:{" "}
            {item.summary}
          </li>
        ))}
      </ul>
      <button onClick={fetchData}>Refresh Data</button>
    </div>
  );
};

export default Forecast;
