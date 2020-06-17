/**
 * Created by yevheniia on 16.06.20.
 */
Promise.all([
    d3.csv("data/rt_2020_06_15.csv"),
    d3.csv("data/states.csv")
]).then(function(data){


    /* розміри */
    var chartOuterWidth = d3.select("#rt-chart-wrapper").node().getBoundingClientRect().width;
    var chartInnerWidth = chartOuterWidth - 80;
    var chartOuterHeight = 400;
    var chartInnerHeight = 320;

    /* загальні змінні */
    const parseDate = d3.timeParse("%Y-%m-%d");
    const formatDate = d3.timeFormat("%d-%m");
    const bisectDate = d3.bisector(function (d) { return d.date; }).left;

    
    const min_date_rt = d3.min(data[0], function (d) { return parseDate(d.date) });
    const max_date_rt = d3.max(data[0], function (d) { return parseDate(d.date) });

    const min_date_bars = d3.min(data[1], function (d) { return parseDate(d.date) });
    const max_date_bars = d3.max(data[1], function (d) { return parseDate(d.date) });



    const ourDate = new Date(max_date_rt);
    const borderDate = ourDate.getDate() - 7;
    ourDate.setDate(borderDate);

    data[0].forEach(function (d) {
        d.date = parseDate(d.date);
        d.mean = +d.mean;
        d.median = +d.median;
        d.lower_50 = +d.lower_50;
        d.lower_90 = +d.lower_90;
        d.upper_50 = +d.upper_50;
        d.upper_90 = +d.upper_90;
    });

    data[1].forEach(function (d) {
        d.date = parseDate(d.date);
        d.base = +d.positive_raw;
        d.positive = +d.positive;
        d.additional = d.positive - d.base;
    });



    /* таблиця */
    var rt_table = data[0].filter(function(d) { return formatDate(d.date) === formatDate(max_date_rt)  });
    var bars_table = data[1].filter(function(d) { return formatDate(d.date) === formatDate(max_date_rt)  });

    var table_data = leftJoin(rt_table, bars_table, "region", "state", "positive");

    var table = d3.select('table')
        .append('table');

    var thead = table.append('thead'),
        tbody = table.append('tbody');

    thead.append('tr').selectAll('th')
        .data(["регіон", "Rt", "кількість"]).enter()
        .append('th')
        .text(function (d) { return d; });

    var rows = tbody.selectAll('tr')
        .data(table_data)
        .enter()
        .append('tr')
        .attr("id", function(d, i){ return "row-"+ i })
        .attr("data", function (d) { return d.region  })
        .style("background-color", function(d){ return d.region === "Україна"? "lightgrey": "none" });
       
    rows.append('td')
        .attr("id", function (d) { return d.id  })
        .text(function (d) { return d.region;  })
        .style("font-weight", function(d){ return d.region === "Україна" ? "bold": "normal" });



    rows.append('td')
        .text(function (d) {   return d.median.toFixed(2); });

    rows.append('td')
        .text(function (d) {   return d.positive; });

    rows.sort( function(a, b) { return b.median - a.median });



    var borderRt = data[0].filter(function (d) { return formatDate(d.date) === formatDate(ourDate) && d.region === "Україна"  });

    var filtered_rt = data[0].filter(function (d) { return d.region === "Україна" });
    var filtered_bars = data[1].filter(function(d){ return d.state === "Україна"});


    const yScale_rt = d3.scaleLinear()
        .domain([0.6, 1.6])
        .range([chartInnerHeight, 0]);


    const xScale_rt = d3.scaleTime()
        .domain([min_date_rt, max_date_rt])
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
        .attr("y1", yScale_rt(1))
        .attr("y2", yScale_rt(1))
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
        .call(d3.axisBottom(xScale_rt)
            .ticks(2)
            .tickFormat(function (d) {
                return formatDate(d)
            })
            .tickValues([min_date_rt, max_date_rt])
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
        .attr("cx", xScale_rt(ourDate))
        .attr("cy", yScale_rt(borderRt[0].median))
        .attr("fill", borderRt[0].median > 1 ? 'rgb(235, 83, 88)' : 'rgb(53, 179, 46)')
        .attr("r", 3);


    var circleLabel = svgRt.append("text")
        .attr("x", xScale_rt(ourDate) - 15)
        .attr("y", yScale_rt(borderRt[0].median) + 16)
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
        .attr("y1", yScale_rt(1.6))
        .attr("y2", yScale_rt(0.6));

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


    drawRt(filtered_rt);


    function drawRt(df){

        let yMin = d3.min(df, function (d) { return d.lower_50 });
        let yMax = d3.max(df, function (d) { return d.lower_50 });

        function redrawRt(){

            chartOuterWidth = d3.select("#rt-chart-wrapper").node().getBoundingClientRect().width;
            chartInnerWidth = chartOuterWidth - 80;
            let borderRt_new = df.filter(function (d) {
                return formatDate(d.date) === formatDate(ourDate)
            });

            yScale_rt.domain([0.6, 1.6]);
            xScale_rt.range([0, chartInnerWidth]);

            d3.select('#main-rt').attr("width", chartOuterWidth);
            svgRt.attr("width", chartOuterWidth);

            selectedRegion
                .text(df[0].region.replace("Ukraine", "Україна") );


            svgRt.select(".y.axis")
                .transition()
                .duration(0)
                .call(d3.axisLeft(yScale_rt)
                    .ticks(5)
                    .tickSize(-chartInnerWidth));


            svgRt.select(".x.axis")
                .transition()
                .duration(500)
                .call(d3.axisBottom(xScale_rt)
                    .ticks(2)
                    .tickFormat(function (d) {
                        return formatDate(d)
                    })
                    .tickValues([min_date_rt, max_date_rt]));

            clipUp
                .transition()
                .duration(0)
                .attr("height", yScale_rt(1))
                .attr("width", chartInnerWidth);

            clipDown
                .transition()
                .duration(0)
                .attr("y", yScale_rt(1))
                .attr("width", chartInnerWidth)
                .attr("height", chartInnerHeight - yScale_rt(1));

            borderLine
                .transition()
                .duration(500)
                .attr("x1", 0)
                .attr("x2", chartInnerWidth)
                .attr("y1", yScale_rt(1))
                .attr("y2", yScale_rt(1));


            smallCircle
                .transition()
                .duration(500)
                .attr("cx", xScale_rt(ourDate))
                .attr("cy", yScale_rt(borderRt_new[0].median))
                .attr("fill", borderRt_new[0].median > 1 ? 'rgb(235, 83, 88)' : 'rgb(53, 179, 46)');

            circleLabel
                .transition()
                .duration(500)
                .attr("x", xScale_rt(ourDate))
                .attr("y", yScale_rt(borderRt_new[0].median) + 16)
                .attr("fill", borderRt_new[0].median > 1 ? 'rgb(235, 83, 88)' : 'rgb(53, 179, 46)')
                .text(borderRt_new[0].median.toFixed(2));


            line1
                .transition()
                .duration(500)
                .attr("clip-path", function (d) {
                    return "url(#clip-" + d + ")";
                })
                .attr("d", d3.line()
                    .x(function (d, i) { return xScale_rt(d.date);})
                    .y(function (d) { return yScale_rt(d.median); })
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
                    .x(function (d, i) { return xScale_rt(d.date);})
                    .y(function (d) { return yScale_rt(d.median); })
                    (df.filter(function (p) { return p.date.getTime() >= ourDate.getTime() })   )
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
                    .x(function (d, i) { return xScale_rt(d.date); })
                    .y0(function (d) { return yScale_rt(d.upper_50); })
                    .y1(function (d) { return yScale_rt(d.lower_50); })
                    (df)
                );
        } /* end of redraw RT*/

        redrawRt();

        overlay
            .on("mousemove", mousemove);


        /* mouseover */
        function mousemove() {
            var x0 = xScale_rt.invert(d3.mouse(this)[0]),
                i = bisectDate(df, x0, 1),
                d0 = df[i - 1],
                d1 = df[i],
                d = x0 - d0.date > d1.date - x0 ? d1 : d1;
            focus.attr("transform", "translate(" + xScale_rt(d.date) + "," + 0 + ")");


            focus.select("text.text-date")
                .attr("x", function () {
                    return xScale_rt(d.date) > (chartInnerWidth / 2) ? -( this.getBBox().width + 9) : 9
                })
                .html(d3.timeFormat("%d-%m, %Y")(d.date));


            focus.select("text.text-Rt")
                .attr("x", function () {
                    return xScale_rt(d.date) > (chartInnerWidth / 2) ? -( this.getBBox().width + 9) : 9
                })
                .html("R: " + d.median.toFixed(2));
        }

        /* window resize */
        window.addEventListener("resize", redrawRt);
    }



    /* -----------------------------
            draw bars -------------- */


    const svgBars = d3.select("#amount-chart")
        .append("svg")
        .attr("width", chartOuterWidth)
        .attr("height", chartOuterHeight)
        .attr("id", "main-amount")
        .append("g")
        .attr("transform", "translate(50,50)");

    const subgroups = ["base","additional"];

    var groups = d3.map(filtered_bars, function (d) { return (d.date) }).keys();

    const color = d3.scaleOrdinal()
        .domain(subgroups)
        .range(['grey', 'pink']);

    const xScale = d3.scaleBand()
        .domain(groups)
        .range([0, chartInnerWidth])
        .padding([0.2]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(filtered_bars, function(d) { return d.positive})])
        .range([chartInnerHeight, 0]);

    svgBars.append("g")
        .attr("class", "y-axis");


    svgBars.append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(0," + chartInnerHeight + ")");


    drawBars(filtered_bars);

    function drawBars(df) {

        groups = d3.map(df, function (d) { return (d.date) }).keys();

        yScale.domain([0, d3.max(df, function(d) { return d.positive })]);

        var stackedData = d3.stack()
            .keys(subgroups)
            (df);

        redrawBars();

        function redrawBars(){
           chartOuterWidth = d3.select("#rt-chart-wrapper").node().getBoundingClientRect().width;
           chartInnerWidth = chartOuterWidth - 80;
           chartOuterHeight = 400;
           chartInnerHeight = 320;

            d3.select('#main-amount').attr("width", chartOuterWidth);
            svgBars.attr("width", chartOuterWidth);

            xScale
                .domain(groups)
                .range([0, chartInnerWidth]);

            svgBars.select(".y-axis")
                .transition()
                .duration(0)
                .call(d3.axisLeft(yScale)
                    .ticks(5)
                    .tickSize(-chartInnerWidth));


            svgBars.select(".x-axis")
                .transition()
                .duration(500)
                .call(d3.axisBottom(xScale)
                    .ticks(2)
                    .tickFormat(function (d) {
                        return formatDate(d)
                    })
                    .tickValues([min_date_bars, max_date_bars]));

            // Show the bars
            var barsLayer = svgBars
                .selectAll("g.bars-wrapper")
                .data(stackedData);

            barsLayer.exit().remove();

            barsLayer
                .enter()
                .append("g")
                .attr("class", "bars-wrapper")
                .attr("fill", function (d) {
                    return color(d.key);
                });

            var bars = svgBars
                .selectAll("g.bars-wrapper")
                .selectAll("rect")
                .data(function (d) { return d; });

            bars.exit().remove();

            bars.enter()
                .append("rect")
                .attr("x", function (d) { return xScale(d.data.date); })
                .attr("y", function (d) { return chartInnerHeight })
                .attr("width", xScale.bandwidth())
                .merge(bars)
                .transition()
                .duration(500)
                .attr("x", function (d) { return xScale(d.data.date); })
                .attr("y", function (d) { return yScale(d[1]); })
                .attr("width", xScale.bandwidth())
                .attr("height", function (d) { return yScale(d[0]) - yScale(d[1]); })
        }

        window.addEventListener("resize", redrawBars);

    }




    /* radraw on table click */
    d3.selectAll("tr").on("click", function(d){


        let region = d3.select(this).attr("data");
        let row_id = d3.select(this).attr("id");

        let new_rtData =  data[0].filter(function (d) {
            return d.region === region
        });

        let new_barsData = data[1].filter(function (d) {
            return d.state === region
        });

        drawRt(new_rtData);
        drawBars(new_barsData);

        $('html, body').animate({
            scrollTop: $("#charts-container").offset().top
        }, 800, function(){})


        })

});


function leftJoin(left, right, left_id, right_id, col_to_join) {
    var result = [];
    _.each(left, function (litem) {
        var f = _.filter(right, function (ritem) {
            return ritem[right_id] == litem[left_id];
        });
        if (f.length == 0) {
            f = [{}];
        }
        _.each(f, function (i) {
            var newObj = {};
            _.each(litem, function (v, k) {
                newObj[k] = v;
            });
            _.each(i, function (v, k) {
                if(k == col_to_join) {
                    newObj[k] = v;
                }
            });
            result.push(newObj);
        });
    });
    return result;
}