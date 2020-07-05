/**
 * Created by yevheniia on 16.06.20.
 */
Promise.all([
    d3.csv("data/rt_2020_06_15.csv"),
    d3.csv("data/states.csv")
]).then(function(data){

    /* розміри */
    var chartOuterWidth = d3.select("#rt-chart-wrapper").node().getBoundingClientRect().width;
    var chartInnerWidth = chartOuterWidth - 50;
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
        .data(["регіон", "R<sub>t</sub> ("+ formatDate(max_date_rt) + ")", "нових випадків ("+ formatDate(max_date_rt) + ")" ]).enter()
        .append('th')
        .html(function (d) { return d; });

    var rows = tbody.selectAll('tr')
        .data(table_data)
        .enter()
        .append('tr')
        .attr("id", function(d, i){ return "row-"+ i })
        .attr("data", function (d) { return d.region  })
        .style("background-color", function(d){ return d.region === "Україна"  ? "lightgrey": "none" });
       
    rows.append('td')
        .attr("id", function (d) { return d.id  })
        .text(function (d) { return d.region;  })
        .style("font-weight", function(d){ return d.region === "Україна" || d.region === "м. Київ" ? "bold": "normal" });


    rows.append('td')
        .text(function (d) {   return d.median.toFixed(2); })
        .style("font-weight", function(d){ return d.region === "Україна" || d.region === "м. Київ" ? "bold": "normal" })
        .style("color", function(d){ return d.median >=1 ? "rgb(235, 83, 88)": "rgb(53, 179, 46)" });

    rows.append('td')
        .text(function (d) {   return d.positive; })
        .style("font-weight", function(d){ return d.region === "Україна" || d.region === "м. Київ" ? "bold": "normal" })
       ;

    rows.sort( function(a, b) { return b.median - a.median })
        ;



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
        .attr("transform", "translate(30,50)");

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

    var leftNote = svgRt.append("text")
        .attr("class", "left-note")
        .attr("x", "20")
        .attr("y", yScale_rt(0.9))
        .attr("text-anchor", "start")
        .style("font-size", "13px")
        .style("pointer-events", "none")
        .attr("fill", "grey")
        .text("Лінія на графіку, це середнє значення Rt отримане за допомогою моделювання")
        .call(wrap, 120);

    var rightNote = svgRt.append("text")
        .attr("class", "right-note")
        .attr("y", yScale_rt(0.9))
        .attr("x", chartInnerWidth - 20)
        .attr("text-anchor", "end")
        .style("font-size", "13px")
        .style("pointer-events", "none")
        .attr("fill", "grey")
        .text("Прозора зона навколо – це інтервал найбільш ймовірних змодельованих значень Rt")
        .call(wrap, 110);


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

    var focus_rt = svgRt.append("g")
        .attr("class", "focus")
        .style("display", "none");

    focus_rt.append("line")
        .attr("class", "x")
        .style("stroke", "grey")
        .style("stroke-dasharray", "3.3")
        .style("opacity", 0.5)
        .attr("y1", yScale_rt(1.6))
        .attr("y2", yScale_rt(0.6));

    focus_rt.append("text")
        .attr("class", "text-date")
        .attr("y", chartInnerHeight - 50)
        .style("font-size", "14px");

    focus_rt.append("text")
        .attr("class", "text-Rt")
        .attr("y", chartInnerHeight - 35)
        .style("font-size", "14px");

    //overlay
    var overlay = svgRt.append("rect")
        .attr("class", "overlay")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .on("mouseover", function () {
            focus_rt.style("display", null);
            d3.select(".right-note").style("opacity", 0.5);
            d3.select(".left-note").style("opacity", 0.5);
        })
        .on("mouseout", function () {
            focus_rt.style("display", "none")
        });


    drawRt(filtered_rt);


    function drawRt(df){

        let yMin = d3.min(df, function (d) { return d.lower_50 });
        let yMax = d3.max(df, function (d) { return d.lower_50 });

        function redrawRt(){

            chartOuterWidth = d3.select("#rt-chart-wrapper").node().getBoundingClientRect().width;
            chartInnerWidth = chartOuterWidth - 50;
            let borderRt_new = df.filter(function (d) {
                return formatDate(d.date) === formatDate(ourDate)
            });

            yScale_rt.domain([0.6, 1.6]);
            xScale_rt.range([0, chartInnerWidth]);

            d3.select('#main-rt').attr("width", chartOuterWidth);
            svgRt.attr("width", chartOuterWidth);



            selectedRegion
                .text(df[0].region + ", динаміка Rt" );


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
            focus_rt.attr("transform", "translate(" + xScale_rt(d.date) + "," + 0 + ")");


            focus_rt.select("text.text-date")
                .attr("x", function () {
                    return xScale_rt(d.date) > (chartInnerWidth / 2) ? -( this.getBBox().width + 9) : 9
                })
                .html(d3.timeFormat("%d-%m, %Y")(d.date));


            focus_rt.select("text.text-Rt")
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
        .attr("transform", "translate(30,50)");

    const subgroups = ["base","additional"];

    var groups = d3.map(filtered_bars, function (d) { return (d.date) }).keys();

    const color = d3.scaleOrdinal()
        .domain(subgroups)
        .range(['rgb(235, 83, 88)', '#89cff0']);

    const xScale = d3.scaleBand()
        .domain(groups)
        .range([0, chartInnerWidth])
        .padding([0.2]);

    const x = d3.scaleLinear()
        .domain([min_date_bars, max_date_bars])
        .range([0, chartInnerWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, 900])
        .range([chartInnerHeight, 0]);

    svgBars.append("g")
        .attr("class", "y-axis");


    svgBars.append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(0," + chartInnerHeight + ")");

    var chartTitle = svgBars.append("text")
        .attr("transform", "translate(0," + -30 + ")")
        .attr("x", "0")
        .attr("text-anchor", "start")
        .style("font-weight", "bold")
        .text("Кількість нових випадків за день");

    var focus_bars = svgBars.append("g")
        .attr("class", "focus_bars")
        .style("display", "none");

    focus_bars.append("line")
        .attr("class", "x")
        .style("stroke", "grey")
        .style("stroke-dasharray", "3.3")
        .style("opacity", 0.5)
        .attr("y1", 0)
        .attr("y2", chartInnerHeight);

    focus_bars.append("text")
        .attr("class", "text-date")
        .attr("y", 35)
        .style("font-size", "14px");

    focus_bars.append("text")
        .attr("class", "text-Rt")
        .attr("y", 50)
        .style("font-size", "14px");

    //overlay
    var overlay_bars = svgBars.append("rect")
        .attr("class", "overlay")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .on("mouseover", function () {
            focus_bars.style("display", null);
        })
        .on("mouseout", function () {
            focus_bars.style("display", "none")
        });


    drawBars(filtered_bars);

    function drawBars(df) {
        var max_val = d3.max(df, function(d) { return d.positive });
        max_val = Math.ceil(max_val / 25) * 25;

        groups = d3.map(df, function (d) { return (d.date) }).keys();

        yScale.domain([0, max_val]);

        var stackedData = d3.stack()
            .keys(subgroups)
            (df);

        redrawBars();

        function redrawBars(){
           chartOuterWidth = d3.select("#rt-chart-wrapper").node().getBoundingClientRect().width;
           chartInnerWidth = chartOuterWidth - 50;
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
                    .tickSize(-chartInnerWidth)
                    .tickValues([0, max_val/5, max_val/5 * 2, max_val/5 * 3, max_val/5 * 4, max_val])
                );


            svgBars.select(".x-axis")
                .transition()
                .duration(500)
                .call(d3.axisBottom(xScale)
                    .ticks(2)
                    .tickFormat(function (d) {
                        return formatDate(d)
                    })
                    .tickValues([min_date_bars, max_date_bars])
                );

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
                .style("pointer-events", "none")

                .merge(bars)
                .transition()
                .duration(500)
                .attr("x", function (d) { return xScale(d.data.date); })
                .attr("y", function (d) { return yScale(d[1]); })
                .attr("width", xScale.bandwidth())
                .attr("height", function (d) { return yScale(d[0]) - yScale(d[1]); })


            $('g.focus_bars').remove().appendTo('svg#main-amount g');
        }


        overlay_bars
            .on("mousemove", mousemove);


        /* mouseover */
        function mousemove() {
            var x0 = x.invert(d3.mouse(this)[0]),
                i = bisectDate(df, x0, 1),
                d0 = df[i - 1],
                d1 = df[i],
                d = x0 - d0.date > d1.date - x0 ? d1 : d1;
            focus_bars.attr("transform", "translate(" + xScale(d.date) + "," + 0 + ")");


            focus_bars.select("text.text-date")
                .attr("x", function () {
                    return xScale(d.date) > (chartInnerWidth / 2) ? -( this.getBBox().width + 9) : 9
                })
                .html(d3.timeFormat("%d-%m, %Y")(d.date));


            focus_bars.select("text.text-Rt")
                .attr("x", function () {
                    return xScale(d.date) > (chartInnerWidth / 2) ? -( this.getBBox().width + 9) : 9
                })
                .html(d.positive);
        }

        window.addEventListener("resize", redrawBars);

    }




    /* radraw on table click */
    d3.selectAll("tr").on("click", function(d){


        let region = d3.select(this).attr("data");
        let row_top = d3.select(this).node().getBoundingClientRect().top;

        let new_rtData =  data[0].filter(function (d) {
            return d.region === region
        });

        let new_barsData = data[1].filter(function (d) {
            return d.state === region
        });

        drawRt(new_rtData);
        drawBars(new_barsData);


       document.getElementById('charts-container').scrollIntoView({block: 'start', behavior: 'smooth'});



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

function f(num){
    let count = 0;
    while(num > 1){
        count ++;
        num/= 10;
    }
    return Math.pow(10, count-1) * (Math.round(num) ? 10: 1);
}



function wrap(text, width) {
    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            x = text.attr("x"),
            y = text.attr("y"),
            dy = 0,
            tspan = text.text(null)
                .append("tspan")
                .attr("x", x)
                .attr("y", y)
               .attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("dy", ++lineNumber * lineHeight + dy + "em")
                    .text(word);
            }
        }
    });
}
