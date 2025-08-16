const nodeId = args[0] ? parseInt(args[0]) : 1;
const latitude = parseFloat(args[1]) || 40.7128;
const longitude = parseFloat(args[2]) || -74.0060;

const meterIds = {
  "1": secrets.meter1 || "meter_123",
  "2": secrets.meter2 || "meter_456"
};

const meterId = meterIds[nodeId.toString()] || "default_meter";

const response = await Functions.makeHttpRequest({
  url: `https://utilityapi.com/api/v2/intervals`,
  method: "GET",
  headers: {
    "Authorization": `Bearer ${secrets.utilityApiKey}`,
    "Content-Type": "application/json"
  },
  params: {
    meters: meterId,
    limit: 1,
    order: "desc"
  }
});

if (response.error) {
  console.error("UtilityAPI request failed:", response.error);
  
  console.log("Falling back to mock data...");
  const mockKwh = Math.random() * 5000 + 1000;
  const mockTimestamp = Math.floor(Date.now() / 1000);
  
  const latitudeFixed = Math.floor(latitude * 1000000);
  const longitudeFixed = Math.floor(longitude * 1000000);
  const kwhFixed = Math.floor(mockKwh);
  
  return Functions.encodeUint256(
    BigInt(mockTimestamp) << 192n |
    BigInt(kwhFixed) << 128n |
    BigInt(latitudeFixed) << 64n |
    BigInt(longitudeFixed) << 32n |
    BigInt(nodeId)
  );
}

const data = response.data;
if (!data || !data.intervals || data.intervals.length === 0) {
  console.error("No interval data found");
  throw Error("No data available");
}

const interval = data.intervals[0];
const kwhValue = interval.kwh || 0;
const timestampValue = Math.floor(new Date(interval.start).getTime() / 1000);

const latitudeFixed = Math.floor(latitude * 1000000);
const longitudeFixed = Math.floor(longitude * 1000000);
const kwhFixed = Math.floor(kwhValue * 1000);

const encodedResponse = Functions.encodeUint256(
  BigInt(timestampValue) << 192n |
  BigInt(kwhFixed) << 128n |
  BigInt(latitudeFixed) << 64n |
  BigInt(longitudeFixed) << 32n |
  BigInt(nodeId)
);

return encodedResponse;