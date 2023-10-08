
let moistureChart, batteryChart, dataChart, temperatureChart;
let width, height, gradient;
let newData;



function setChartTimeframe(event, changingChart, value){
	let newTimeFrame;
	if(value == "all") newTimeFrame = Date.UTC(2023,5,25,0,0);
	else newTimeFrame = newData[0].timestamp-value*60*60*1000;

	let caller = event.target;
	
	for(el of event.parentNode.children) el.classList.remove("active");
	event.classList.add("active")

	let settings;

	switch(changingChart){		
		case 'moisture':
			settings = moistureChart.options.scales.x;//.min = newTimeFrame;
			settings.min = newTimeFrame;
			moistureChart.options.scales.x = settings;
			moistureChart.update();
		case 'battery':
			settings = batteryChart.options.scales.x;//.min = newTimeFrame;
			settings.min = newTimeFrame;
			batteryChart.options.scales.x = settings;
			batteryChart.update();
		case 'temperature':
			settings = temperatureChart.options.scales.x;//.min = newTimeFrame;
			settings.min = newTimeFrame;
			temperatureChart.options.scales.x = settings;
			temperatureChart.update();
	}

}


function refresh() {

	// chart1.data.datasets <<--- update data inside the chart
	gauge1.setValueAnimated(data[0].count);
	updateBatteryCard(data[0].battery);

	chart1.update();
}



// BATTERY CARD

function updateBatteryCard(batteryVoltage) {
	let batteryPercentage = ((batteryVoltage - 3.6) / (4.3 - 3.6)) * 100;

	document.getElementById("battery-percentage").innerText =
		batteryPercentage.toFixed(0);
	document.getElementById("battery-voltage").innerText =
		batteryVoltage.toFixed(2);
}




// MOISTURE GAUGE

var gauge1 = Gauge(document.getElementById("gauge2"), {
	max: 100,
	dialStartAngle: 180,
	dialEndAngle: 0,
	value: 0,
	viewBox: "0 3 100 53",
});




// CHARTS


function getGradient(ctx, chartArea, colorsStop) {
	const chartWidth = chartArea.right - chartArea.left;
	const chartHeight = chartArea.bottom - chartArea.top;
	if (!gradient || width !== chartWidth || height !== chartHeight) {
		// Create the gradient because this is either the first render
		// or the size of the chart has changed
		width = chartWidth;
		height = chartHeight;
		gradient = ctx.createLinearGradient(
			0,
			chartArea.bottom,
			0,
			chartArea.top
		);
		gradient.addColorStop(0, colorsStop[0]);
		gradient.addColorStop(1, colorsStop[1]);
	}

	return gradient;
}



const options = {
	maintainAspectRatio: false,
	plugins: {
		legend: {
			display: false,
		},
	},
	scales: {
		x: {
			type: "time",
			min: Date.UTC(2022,11,23,0,0),//'2022-12-22 00:00:00',
			time: {
				unit: "day",
				displayFormats: {
					day: 'dd MMM'
			  },
			},
			grid: {
				color: "transparent",
				tickColor: "transparent",
			},
		},
		y: {
			border: {
				color: "transparent",
			},
			grid: {
				color: "rgb(52, 52, 62)",
				tickColor: "transparent",
			},
		},
	},
};

function createChart(chartID, chartData, gradientColors) {
	return new Chart(document.getElementById(chartID), {
		type: "line",
		options: options,
		data: {
			labels: chartData.labels,
			datasets: [
				{
					data: chartData.data,
					pointRadius: 2,
					pointStyle: false,//"rectRounded",

					borderColor: function (context) {
						const { ctx, chartArea } = context.chart;

						if (!chartArea) {
							// This case happens on initial chart load
							return;
						}
						return getGradient(ctx, chartArea, gradientColors);
					},
					elements: {
						line: {
							tension: 0.2,
							borderWidth: 2,
							borderJoinStyle: "round",
						},
					},
				},
			],
		},
	})

}

function lowPassFilter(inputData, parameters = {a : 0.8}){

	const len = inputData.length;
	let smoothedData = new Array(len);

	smoothedData[len-1] = inputData[len-1];

	for (let i = len - 2; i >=0 ; i--) {
		smoothedData[i] = smoothedData[i+1] + parameters.a * (inputData[i] - smoothedData[i+1]);
	}

	return smoothedData;
}



(async function () {
	const response = await fetch(URL,{method:'GET'})

	const database = await response.json()
	
	
	newData = database.Items.map((i) => ({
		data: JSON.parse(i.payload.substring(23)),
		timestamp: i.timestamp,
	}));
	newData.sort((a, b) => b.timestamp - a.timestamp);


	gauge1.setValueAnimated(newData[0].data.moisture);
	updateBatteryCard(newData[0].data.battery);


	moistureChart = createChart(
		"MoistureChart", 
		{
			labels:newData.map((row) => row.timestamp),
			data:lowPassFilter(newData.map((row) => row.data.moisture),{a:0.2})
			// data:newData.map((row) => row.data.moisture)
		},
		["#bde7ff","#3eb8ff"]
	);
	moistureChart.data.datasets.push(	{
		data: newData.map((row) => row.data.moisture),
		pointStyle: "rectRounded",
		showLine: false,
		pointRadius: 2,
		pointBorderColor: 'rgba(255, 255, 255, 0.2)'
	})
	moistureChart.update();

	gradient = null;

	batteryChart = createChart(
		"BatteryChart", 
		{
			labels:newData.map((row) => row.timestamp),
			data:newData.map((row) => row.data.battery)
		},
		["#bdffbe","#23ff27"]
	);

	gradient = null;

	temperatureChart = createChart(
		"TemperatureChart", 
		{
			labels:newData.map((row) => row.timestamp),
			data:newData.map((row) => row.data.temp)
		},
		["#ff9f7f","#f9270c"]
	);
	
	dataChart = new Chart(document.getElementById("DataChart"), {
		type: "bar",
		options: {
			...options,
			scales: {
		}},
		data: {
			labels: Array(25).fill(1),
			datasets: [
				{
					data: Array(25).fill(1),
					borderColor: "white",
					backgroundColor: "#fff823",
					barThickness: 3.5,
					borderRadius: 4,
				},
			],
		},
	});
})();

