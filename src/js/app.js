import * as d3 from "d3"
import * as topojson from "topojson"


var maps = [{
	"label" : "NSW",
	"centre" : [147,-33],
	"zoom" : 3.9,
	"active" : true
},{
	"label" : "Sydney",
	"centre" : [151,-33.8],
	"zoom" : 40,
	"active" : false
}]

function init(sheets, nsw, places) {

	const container = d3.select("#coronaMapContainer")
	const container2 = d3.select("#sydneyMapContainer")
	
	var isMobile;
	var windowWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);

	if (windowWidth < 610) {
			isMobile = true;
	}	

	if (windowWidth >= 610){
			isMobile = false;
	}

	var width = document.querySelector("#coronaMapContainer").getBoundingClientRect().width
	var height = width*0.8


	var ratio = (maps[0].active) ? maps[0].zoom : maps[1].zoom

	var centre = (maps[0].active) ? maps[0].centre : maps[1].centre

	var projection = d3.geoMercator()
                    .center(centre)
                    .scale(width*ratio)
                    .translate([width/2,height/2])

	container.select("#nswMap").remove()

	var data = sheets.sheets.locations.filter(d => d.State == "NSW")

	var extent = d3.extent(sheets.sheets.locations, d => +d.Cases)
	console.log(extent)
	var lastUpdated = data[0].Date

	d3.select("#lastUpdated").text(lastUpdated)

	extent = [1,100]
	var mapData = d3.map(data, function(d) { return d.Location; });
	console.log(mapData.get('Albury (C)'))

	nsw.objects['nsw-lga-2019'].geometries.forEach(function(d) {
		console.log(d.properties.LGA_NAME19)
		// var entry = mapData.get(d.properties.LGA_NAME19)
		// console.log(entry['Cases'])
		if (mapData.has(d.properties.LGA_NAME19)) {
			var cases;
			if (mapData.get(d.properties.LGA_NAME19)['Cases'] == "1-4") {
				cases = 2
			}

			else {
				cases = +mapData.get(d.properties.LGA_NAME19)['Cases']
			}
			d.properties.cases = cases
		}

		else {
			d.properties.cases = 0
		}
		
	})

	console.log(data)

	var svg = container.append("svg")	
	                .attr("width", width)
					.attr("height", height)
	                .attr("id", "nswMap")
	                .attr("overflow", "hidden");

	var features = svg.append("g")

	var filterPlaces = places.features.filter(function(d){ 
		if (isMobile) {
			return d.properties.scalerank < 2	
		}

		else {
			return d.properties.scalerank < 4		
		}
		
	});

	var path = d3.geoPath()
	    .projection(projection);

	var geo = topojson.feature(nsw,nsw.objects['nsw-lga-2019']).features    

	var centroids = geo.map(function (feature){
		// console.log(feature)
    	feature.properties['centroid'] = path.centroid(feature);
    	return feature.properties
  	});

	const radius = d3.scaleSqrt()
		.range([2, 20])

	radius.domain(extent)

	console.log(centroids)

	features.append("g")
	    .selectAll("path")
	    .attr("id","lgas")
	    .data(topojson.feature(nsw,nsw.objects['nsw-lga-2019']).features)
	    .enter().append("path")
	        .attr("class", "lga")
	        .attr("fill", "none")
	        .attr("stroke", "#bcbcbc")
	        .attr("data-tooltip","")
	        .attr("d", path);      

	var mapCircles1 = features.selectAll(".mapCircle")
						.data(centroids);	        

	mapCircles1					
		.enter()
		.append("circle")
		.attr("class", "mapCircle")
		.attr("title",d => d.LGA_NAME19)
		.attr("cx",d => d.centroid[0])
		.attr("cy",d => d.centroid[1])
		.attr("r", function(d) { 

			if (d.cases > 0) {
				return radius(d.cases) 

			}
			else {
				return 0
			}
		})    

	 features.selectAll("text")
            .data(filterPlaces)
            .enter()
            .append("text")
            .text((d) => d.properties.name)
            .attr("x", (d) => projection([d.properties.longitude, d.properties.latitude])[0])
            .attr("y", (d) => projection([d.properties.longitude, d.properties.latitude])[1])
            .attr("class","label")

    var keyPosX = width * 0.9
    var keyPosY = height * 0.9     

    // Big circle

    container.select("#keyDiv svg").remove();

    var keySvg = container.select("#keyDiv").append("svg")	
	                .attr("width", 200)
					.attr("height", 100)
	                .attr("id", "key")
	                .attr("overflow", "hidden");

    keySvg.append("circle")
            .attr("cx",60)
			.attr("cy",50)
            .attr("class", "mapCircle")
            .attr("r", radius(extent[1])) 

     keySvg.append("text")
            .attr("x",60)
			.attr("y",90)
            .attr("class", "keyLabel")
            .attr("text-anchor", "middle")
            .text(extent[1])         

    // Little circle        

    keySvg.append("circle")
            .attr("cx",10)
			.attr("cy",50)
            .attr("class", "mapCircle")
            .attr("r", radius(extent[0]))

    keySvg.append("text")
            .attr("x",10)
			.attr("y",90)
            .attr("class", "keyLabel")
            .attr("text-anchor", "middle")
            .text(extent[0])

    keySvg.append("text")
            .attr("x",50)
			.attr("y",15)
            .attr("class", "keyLabel")
            .attr("text-anchor", "middle")
            .text("Number of cases")       








} // end init

const location = "docsdata"
const key = "1q5gdePANXci8enuiS4oHUJxcxC13d6bjMRSicakychE"

Promise.all([
		d3.json(`https://interactive.guim.co.uk/${location}/${key}.json`),
		d3.json('<%= path %>/assets/nsw-lga-2019.json'),
		d3.json(`<%= path %>/assets/places_au.json`)
		])
		.then((results) =>  {
			init(results[0], results[1], results[2])

			d3.select("#zoom").on("click", function() {

				if (maps[0].active) {
					maps[0].active = false;
					maps[1].active = true;
					d3.select(this).html("Zoom to NSW")
				} else {
					maps[0].active = true;
					maps[1].active = false;
					d3.select(this).html("Zoom to Sydney")
				}

				init(results[0], results[1], results[2])

			})


			var to=null
			var lastWidth = document.querySelector("#coronaMapContainer").getBoundingClientRect()
			window.addEventListener('resize', function() {
				var thisWidth = document.querySelector("#coronaMapContainer").getBoundingClientRect()
				if (lastWidth != thisWidth) {
					window.clearTimeout(to);
					to = window.setTimeout(function() {
						    init(results[0], results[1], results[2])
						}, 100)
				}
			
			})

});