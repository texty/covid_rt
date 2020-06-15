/**
 * Created by yevheniia on 15.06.20.
 */

d3.csv("data/rt_2020_06_12.csv").then(function(data) {

    const parseDate = d3.timeParse("%Y-%m-%d");
    const formatDate = d3.timeFormat("%d-%m");

    var bisectDate = d3.bisector(function (d) {
        return d.date;
    }).left;


    const min_date = d3.min(data, function (d) {
        return parseDate(d.date)
    });
    
    const max_date = d3.max(data, function (d) {
        return parseDate(d.date)
    });


    data.forEach(function (d) {
        d.date = parseDate(d.date);
        d.mean = +d.mean;
        d.median = +d.median;
        d.lower_50 = +d.lower_50;
        d.lower_90 = +d.lower_90;
        d.upper_50 = +d.upper_50;
        d.upper_90 = +d.upper_90;
    });


    let chartOuterWidth = d3.select("#rt-chart-wrapper").node().getBoundingClientRect().width;
    var chartInnerWidth = chartOuterWidth - 80;

    var chartOuterHeight = 400;
    var chartInnerHeight = 320;


    var ourDate = new Date(max_date);
    var borderDate = ourDate.getDate() - 7;
    ourDate.setDate(borderDate);
    
    let borderRt = data.filter(function (d) {
        return formatDate(d.date) === formatDate(ourDate) && d.region === "Ukraine"
    });

    var filtered = data.filter(function (d) {
        return d.region === "Ukraine"
    });

    const yScale = d3.scaleLinear()
        .domain([0.6, 1.6])
        .range([chartInnerHeight, 0]);


    const xScale = d3.scaleTime()
        .domain([min_date, max_date])
        .range([0, chartInnerWidth]);


    const svgRt = d3.select("#rt-chart")
        .append("svg")
        .attr("width", chartOuterWidth)
        .attr("height", chartOuterHeight)
        .attr("id", "main-rt")
        .append("g")
        .attr("transform", "translate(50,50)");

    const borderLine = svgRt.append("line")
        .attr("x1", 0)
        .attr("x2", chartInnerWidth)
        .attr("y1", yScale(1))
        .attr("y2", yScale(1))
        .attr("stroke", "grey");

    var clipUp =  svgRt.append("clipPath")
        .attr("id", "clip-up")
        .append("rect")
        .attr("width", chartInnerWidth);


    var clipDown = svgRt.append("clipPath")
        .attr("id", "clip-down")
        .append("rect")
        .attr("width", chartInnerWidth);


    /* region label */
    var selectedRegion = svgRt.append("text")
        .attr("transform", "translate(0," + -30 + ")")
        .attr("x", "0")
        .attr("text-anchor", "start")
        .style("font-weight", "bold");



    /* region label */
    var text = svgRt.append("text")
        .attr("transform", "translate(0," + 0 + ")")
        .attr("x", "0")
        .attr("text-anchor", "start")
        .style("font-weight", "bold");


    /* axis */
    svgRt.append("g")
        .attr("transform", "translate(0," + chartInnerHeight + ")")
        .attr("class", "x axis")
        .call(d3.axisBottom(xScale)
            .ticks(2)
            .tickFormat(function (d) {
                return formatDate(d)
            })
            .tickValues([min_date, max_date])
        );

    svgRt.append("g")
        .attr("class", "y axis");


    //цільна лінія
    var line1 = svgRt.selectAll(".single-line1")
        .data(["up", "down"])
        .enter()
        .append("path")
        .attr("class", function (d) {
            return "single-line1 line " + d;
        });

    //пунктирна лінія 7 днів
    var line2 = svgRt.selectAll(".single-line2")
        .data(["up", "down"])
        .enter()
        .append("path")
        .attr("class", function (d) {
            return "single-line2 line " + d;
        });

    // area
    var area =  svgRt.selectAll(".area")
        .data(["up", "down"])
        .enter()
        .append("path")
        .attr("class", function (d) {
            return "area " + d;
        })
        .style("opacity", 0.1);


    //7 days circle
    var smallCircle = svgRt.append("circle")
        .attr("cx", xScale(ourDate))
        .attr("cy", yScale(borderRt[0].median))
        .attr("fill", borderRt[0].median > 1 ? 'rgb(235, 83, 88)' : 'rgb(53, 179, 46)')
        .attr("r", 3);


    var circleLabel = svgRt.append("text")
        .attr("x", xScale(ourDate) - 15)
        .attr("y", yScale(borderRt[0].median) + 16)
        .attr("fill", borderRt[0].median > 1 ? 'rgb(235, 83, 88)' : 'rgb(53, 179, 46)')
        .text(borderRt[0].median.toFixed(2))
        .style("font-size", "12px");



    var focus = svgRt.append("g")
        .attr("class", "focus")
        .style("display", "none");

    focus.append("line")
        .attr("class", "x")
        .style("stroke", "grey")
        .style("stroke-dasharray", "3.3")
        .style("opacity", 0.5)
        .attr("y1", yScale(1.6))
        .attr("y2", yScale(0.6));

    focus.append("text")
        .attr("class", "text-date")
        .attr("y", chartInnerHeight - 50)
        .style("font-size", "14px");

    focus.append("text")
        .attr("class", "text-Rt")
        .attr("y", chartInnerHeight - 35)
        .style("font-size", "14px");

    //overlay
    var overlay = svgRt.append("rect")
        .attr("class", "overlay")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .on("mouseover", function () {
            focus.style("display", null);
        })
        .on("mouseout", function () {
            focus.style("display", "none")
        });


    drawRt(filtered);


    function drawRt(df){


        let yMin = d3.min(df, function (d) { return d.lower_50 });
        let yMax = d3.max(df, function (d) { return d.lower_50 });

        function redrawRt(){

            chartOuterWidth = d3.select("#rt-chart-wrapper").node().getBoundingClientRect().width;
            chartInnerWidth = chartOuterWidth - 80;
            let borderRt_new = df.filter(function (d) {
                return formatDate(d.date) === formatDate(ourDate)
            });

            yScale.domain([0.6, 1.6]);
            xScale.range([0, chartInnerWidth]);

            d3.select('#main-rt').attr("width", chartOuterWidth);
            svgRt.attr("width", chartOuterWidth);

            selectedRegion
                .text(df[0].region.replace("Ukraine", "Україна") );


            svgRt.select(".y.axis")
                .transition()
                .duration(0)
                .call(d3.axisLeft(yScale)
                    .ticks(5)
                    .tickSize(-chartInnerWidth));


            svgRt.select(".x.axis")
                .transition()
                .duration(500)
                .call(d3.axisBottom(xScale)
                    .ticks(2)
                    .tickFormat(function (d) {
                        return formatDate(d)
                    })
                    .tickValues([min_date, max_date]));

            clipUp
                .transition()
                .duration(0)
                .attr("height", yScale(1))
                .attr("width", chartInnerWidth);

            clipDown
                .transition()
                .duration(0)
                .attr("y", yScale(1))
                .attr("width", chartInnerWidth)
                .attr("height", chartInnerHeight - yScale(1));

            borderLine
                .transition()
                .duration(500)
                .attr("x1", 0)
                .attr("x2", chartInnerWidth)
                .attr("y1", yScale(1))
                .attr("y2", yScale(1));


            smallCircle
                .transition()
                .duration(500)
                .attr("cx", xScale(ourDate))
                .attr("cy", yScale(borderRt_new[0].median))
                .attr("fill", borderRt_new[0].median > 1 ? 'rgb(235, 83, 88)' : 'rgb(53, 179, 46)');

            circleLabel
                .transition()
                .duration(500)
                .attr("x", xScale(ourDate))
                .attr("y", yScale(borderRt_new[0].median) + 16)
                .attr("fill", borderRt_new[0].median > 1 ? 'rgb(235, 83, 88)' : 'rgb(53, 179, 46)')
                .text(borderRt_new[0].median.toFixed(2));


            line1
                .transition()
                .duration(500)
                .attr("clip-path", function (d) {
                    return "url(#clip-" + d + ")";
                })
                .attr("d", d3.line()
                    .x(function (d, i) { return xScale(d.date);})
                    .y(function (d) { return yScale(d.median); })
                    (df.filter(function (p) {
                        return p.date.getTime() <= ourDate.getTime() })  )
                )
                .attr("fill", "none");


            line2
                .transition()
                .duration(500)
                .attr("clip-path", function (d) {
                    return "url(#clip-" + d + ")";
                })
                .attr("d", d3.line()
                    .x(function (d, i) { return xScale(d.date);})
                    .y(function (d) { return yScale(d.median); })
                    (df.filter(function (p) { return p.date.getTime() > ourDate.getTime() })   )
                )
                .attr("fill", "none")
                .attr("stroke-dasharray", "3,2");

            area
                .transition()
                .duration(500)
                .attr("clip-path", function (d) {
                    return "url(#clip-" + d + ")";
                })
                .attr("d", d3.area()
                    .x(function (d, i) { return xScale(d.date); })
                    .y0(function (d) { return yScale(d.upper_50); })
                    .y1(function (d) { return yScale(d.lower_50); })
                    (df)
                );
            } /* end of redraw RT*/

        redrawRt();

        overlay
            .on("mousemove", mousemove);


        /* mouseover */
        function mousemove() {
            var x0 = xScale.invert(d3.mouse(this)[0]),
                i = bisectDate(df, x0, 1),
                d0 = df[i - 1],
                d1 = df[i],
                d = x0 - d0.date > d1.date - x0 ? d1 : d1;
            focus.attr("transform", "translate(" + xScale(d.date) + "," + 0 + ")");


            focus.select("text.text-date")
                .attr("x", function () {
                    return xScale(d.date) > (chartInnerWidth / 2) ? -( this.getBBox().width + 9) : 9
                })
                .html(d3.timeFormat("%d-%m, %Y")(d.date));


            focus.select("text.text-Rt")
                .attr("x", function () {
                    return xScale(d.date) > (chartInnerWidth / 2) ? -( this.getBBox().width + 9) : 9
                })
                .html("R: " + d.median.toFixed(2));
        }

        /* window resize */
           window.addEventListener("resize", redrawRt);

    }

    d3.selectAll("tr").on("click", function(d){
        let region = d3.select(this).attr("data");

        let newData =  data.filter(function (d) {
            return d.region === region
        });

        drawRt(newData);

    })




});