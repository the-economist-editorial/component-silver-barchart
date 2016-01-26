/* global document */
import React from 'react';
import ReactDom from 'react-dom';
import Dthree from 'd3';
// D3 components:
import SilverXaxis from '@economist/component-silver-xaxis';
import SilverYaxis from '@economist/component-silver-yaxis';
import SilverSeriesBar from '@economist/component-silver-series-bar';
import SilverChartMargins from '@economist/component-silver-chartmargins';
import SilverLegend from '@economist/component-silver-legend';
// Preferences
import barProperties from './assets/barchart_properties.json';


export default class SilverBarChart extends React.Component {

  // PROP TYPES
  static get propTypes() {
    return {
      test: React.PropTypes.string,
      config: React.PropTypes.object.isRequired,
      // Flag and callback for svg content
      getSvg: React.PropTypes.bool,
      passSvg: React.PropTypes.func,
    };
  }

  // DEFAULT PROPS
  static get defaultProps() {
    return {
      getSvg: false,
    };
  }

  // CONSTRUCTOR
  constructor(props) {
    super(props);
    this.state = {
      // For initial render, duration is set to first element in
      // the array baked into ChartWrapper
      duration: props.config.duration[0],
      // checkMargins flag is true to force stringwidth check
      checkMargins: true,
      // config:
      config: props.config,
    };
  }

  // COMPONENT WILL MOUNT: adjust bounds for number of bars...
  componentWillMount() {
    // Fix later (because in ESLint this whopper overshadows all other errors)
    // const config = { ...this.props.config};
    const config = this.props.config;
    // D3 bounds (i.e. the 'inner box')
    const bounds = this.setBounds(config.dimensions);
    this.setState({ config, bounds });
  }

  // COMPONENT DID MOUNT
  // Invoked after initial mount. If the flag indicates that this is
  // the first stage of the double-render, calls checkStringWidths which:
  //    does the width checks
  //    resets state.checkMargins to false, to prevent a reset-state loop
  // (On this, see: https://github.com/react-bootstrap/react-bootstrap/issues/494)
  componentDidMount() {
    if (this.state.checkMargins) {
      this.checkStringWidths();
    }
  }

  // COMPONENT WILL RECEIVE PROPS
  // Invoked when new props are received AFTER initial render
  componentWillReceiveProps(newProps) {
    // Responds to request to get svg content
    if (newProps.getSvg) {
      // Gather up the SVG here...
      const svgNode = ReactDom.findDOMNode(this.refs.svgwrapper);
      const svgContent = svgNode.innerHTML;
      // Call inherited handler to process SVG
      newProps.passSvg(svgContent);
      // And to prevent a re-render:
      return false;
    }
    // Still here? We aren't doing an SVG collection, so we need to
    // do a complete re-render...
    // NOTE: object-cloning comm'd out coz it conceals other potential errors
    // const config = { ...newProps.config };
    const config = newProps.config;
    // D3 bounds (innerbox)
    const bounds = this.setBounds(config.dimensions);
    this.setState({
      // This.setState doesn't force a premature render in this context.
      // So I'm just using this to force use of 'update' duration
      // baked into ChartWrapper
      duration: newProps.config.duration[1],
      // ...and to reset chart depth:
      config,
      bounds,
      // ...and to force new first/2nd render cycle:
      // checkMargins is evaluated by componentDidMount/Update.
      // That forces 2nd render, after which flag is set back to false
      checkMargins: true,
    });
  }
  // COMPONENT WILL RECEIVE PROPS ends

  // Invoked after post-initial renders
  componentDidUpdate() {
    const duration = this.state.duration;
    if (this.state.checkMargins) {
      // Stage 1 of double-render: adjust for string widths
      this.checkStringWidths();
    } else {
      // Stage 2 of double-render: do the real business...
      this.mainDthreeGroupTransition(duration);
    }
  }
  /*  How flakey is this double-render?
      The danger is of an infinite loop.
      I want to render only twice:
      1) checkMargins=true -- do the checks and adjust the state:
          reset bounds (inner box) (BTW: this is a bar chart issue only)
          set checkMargins=false, to precipitate re-render
      2) checkMargins=false -- draw the real stuff on the page
          The 2nd render occurs and we find ourselves back here, where
          we draw up the D3 with the new state.config properties...
          Nothing then happens to precipitate a re-render
          checkMargins is left 'false'...
      ...until the arrival of new props, with I reset checkMargins=false
      and start the whole rigmarole off again...
  */

  // Param is config object
  // Returns revised background property that defines
  // all background shapes
  resetConfigBackground(config) {
    const bConfig = config.background;
    const height = config.dimensions.height;
    const width = config.dimensions.width;
    for (const i in bConfig) {
      const bItem = bConfig[i];
      // NOTE: this is just testing. I need to set
      // this up properly in the config file...
      if (bItem.adjustable.height) {
        // debugger;
        bItem.height = height;
      }
      if (bItem.adjustable.width) {
        bItem.width = width;
      }
    }
    return bConfig;
  }

  // CHECK STRING WIDTHS
  // Called from componentDidMount/Update on first (test) render
  // For TITLE and SUBTITLE, checks string width against chart width;
  // For SOURCE and FOOTNOTE, checks against 45% of chart width
  //    (this may change, depending on revamp style)
  // if too long, turns the line and tweaks chart depth, innerbox top
  // and positions of relevant strings
  // ALSO:
  //  Adjusts left margin to longest CATEGORY string length
  //  Adjusts right margin for last xaxis label
  // NOTE: this actual code eventually (probably) moves up to ChartWrapper and gets
  // passed into all style components as a prop... (May need a parameter,
  //  or even to split into 2 separate functions, according to style...)
  checkStringWidths() {
    const config = this.state.config;
    // Context
    const svgNode = Dthree.select('.svg-wrapper');
    // Cumulative extra height for the top margin
    let topExtraHeight = 0;
    // === === === Title
    // Temp height adjustment for 'current' string. Reset for each string.
    let tempExtraHeight = config.strings.title.leading;
    let tSpanLen = Dthree.select('.silver-d3-title-string').node().children.length - 1;
    tempExtraHeight *= tSpanLen;
    // Tweak subtitle position with extra height added for title
    config.strings.subtitle.y += tempExtraHeight;
    topExtraHeight += tempExtraHeight;
    // === === === Subtitle
    tempExtraHeight = config.strings.subtitle.leading;
    tSpanLen = Dthree.select('.silver-d3-subtitle-string').node().children.length - 1;
    tempExtraHeight *= tSpanLen;
    topExtraHeight += tempExtraHeight;

    // === === === Legend
    // Get a top position for the legend group before we adjust the innerbox for it...
    config.dimensions.legendTop = (config.dimensions.margins.top + topExtraHeight - 10);
    const legendGroup = document.getElementsByClassName('chart-legend-group')[0];
    // if (typeof legendGroup !== 'undefined') {
    const legendHeight = legendGroup.getBoundingClientRect().height;
    console.log(`Height of legend box: ${legendHeight}`)
    topExtraHeight += Math.round(legendHeight);
    // }
    // === === === Legend ends

    // Tweak inner box top with extra height so far...
    config.dimensions.margins.top += topExtraHeight;

    // Cumulative extra height for bottom margin
    let bottomExtraHeight = 0;
    // === === === Source
    tempExtraHeight = config.strings.source.leading;
    tSpanLen = Dthree.select('.silver-d3-source-string').node().children.length - 1;
    tempExtraHeight *= tSpanLen;
    // Source moves UP from bottom
    config.strings.source.y -= tempExtraHeight;
    bottomExtraHeight += tempExtraHeight;
    // NOTE: I haven't done the footnote yet...
    // So there's be a bit more code to deal with that, once we've decided,
    // post-revamp, what the source and footnote do...
    //
    // So now we have a cumulative extra height
    config.dimensions.margins.bottom += bottomExtraHeight;
    // NOTE: outer box DOESN'T change -- up to user to make the call
    // config.dimensions.outerbox.height += (topExtraHeight + bottomExtraHeight);
    // But innerbox height DOES change...
    config.dimensions.innerbox.height -= (topExtraHeight + bottomExtraHeight);
    // === === === Longest bar chart category:
    // Text object
    const testText = svgNode.append('text')
      .attr('id', 'testText')
      ;
    // String is in config:
    let testStr = config.longestCatString;
    testText
      .attr('class', 'd3-yaxis-check')
      .text(testStr);
    // Width of text...
    let tWidth = testText.node().getComputedTextLength();
    // ...  + gap between labels and axis
    tWidth += barProperties.yAxis.tickPadding;
    // Update the bounds
    config.dimensions.margins.left += tWidth;
    config.dimensions.innerbox.width -= tWidth;
    // === === === Last string on x-axis
    testStr = String(config.minmax.max);
    // NOTE: crudely, for now: if it's > 1,000, add a comma to the string!
    // Don't forget decimal points, too!! But also see Evernote on
    // D3's handling of axis ticks...
    if (parseInt(testStr, 10) >= 1000000) {
      // NOTE: basically, this is crap. But for now...
      testStr += ',,';
    } else if (parseInt(testStr, 10) >= 1000) {
      testStr += ',';
    }
    testText
      .attr('class', 'd3-xaxis-check')
      .text(testStr);
    tWidth = testText.node().getComputedTextLength();
    // Hard assumption for now: that xaxis strings are centre-aligned
    config.dimensions.innerbox.width -= (tWidth / 2);
    // All done: clear the text object...
    testText.remove();
    // Reset background elements:
    config.background = this.resetConfigBackground(config);
    // Recalculate bounds...
    const bounds = this.setBounds(config.dimensions);
    // ...and precipitate 2nd render with new margin settings,
    // turning flag off to prevent infinite loop...
    this.setState({
      checkMargins: false,
      config,
      bounds,
    });
  }

  //
  // ==================================
  // D3 component configuration objects:
  // ==================================

  // CONFIG X-AXIS
  // Assembles x-axis config object with properties:
  // duration, bounds, orient, scale
  configXaxis(xConf) {
    const xProps = barProperties.xAxis;
    // Tick length from properties lookup...
    let tickLength = xProps.tickLength.length;
    // ...unless tick style is 'across' -> full height:
    if (xProps.tickLength.across) {
      tickLength = this.state.bounds.height;
    }
    const xAxisConfig = {
      firstRender: this.state.checkMargins,
      duration: xConf.duration,
      bounds: this.state.bounds,
      tickDensity: xConf.minmax.ticks,
      // Style-specific properties:
      orient: xProps.orient,
      tickLength,
      tickPadding: xProps.tickPadding,
    };
    // Assemble the x-scale object
    xAxisConfig.scale = Dthree.scale.linear()
      .range([ 0, this.state.bounds.width ])
      .domain([ xConf.minmax.min, xConf.minmax.max ]);
    xAxisConfig.checkMargins = this.state.checkMargins;
    return xAxisConfig;
  }
  // CONFIG X-AXIS ends

  // CONFIG Y-AXIS
  // Assembles y-axis config object
  configYaxis(yConf) {
    const yProps = barProperties.yAxis;
    // Tick length from properties lookup...
    let tickLength = yProps.tickLength.length;
    // ...unless tick style is 'across' -> full width:
    if (yProps.tickLength.across) {
      tickLength = this.state.bounds.width;
    }
    const yAxisConfig = {
      firstRender: this.state.checkMargins,
      duration: yConf.duration,
      bounds: this.state.bounds,
      orient: barProperties.yAxis.orient,
      tickLength,
      tickPadding: yProps.tickPadding,
    };
    // Assemble the y-scale object
    // Get category column header, to identify each cat string in data:
    const catHead = yConf.headers[0];
    const yDomain = yConf.data.map((ddd) => ddd[catHead]);
      // NOTE: rangebands for bar charts are 'top-to-bottom', unlike
      // other components that run 'bottom-to-top'. This relates to
      // sorting...
    // Rangeband gaps:
    const rbGaps = this.getRangeBandGaps(yAxisConfig.bounds.height, yConf.pointCount);
    yAxisConfig.scale = Dthree.scale.ordinal()
      .domain(yDomain)
      .rangeBands([ 0, yAxisConfig.bounds.height ], rbGaps.inner, rbGaps.outer);
    return yAxisConfig;
  }
  // CONFIG Y-AXIS ends

  // CONFIG SERIES BARS
  // Assembles bar series config object
  configSeriesBars(seriesConf) {
    const config = {
      firstRender: this.state.checkMargins,
      duration: seriesConf.duration,
      bounds: this.state.bounds,
    };
    // Assemble the x-scale object
    config.xScale = Dthree.scale.linear()
      .range([ 0, this.state.bounds.width ])
      .domain([ seriesConf.minmax.min, seriesConf.minmax.max ]);
      // .domain(this.state.xDomain);
    // And the data:
    config.data = seriesConf.data;
    config.headers = seriesConf.headers;
    config.seriesCount = seriesConf.seriesCount;
    // Colours from component lookup, based on the number of series:
    config.colourSet = barProperties.series.seriesColours[config.seriesCount - 1];
    // Assemble the y-scale object
    // Get category column header, to identify each cat string in data:
    const catHead = seriesConf.headers[0];
    const yDomain = seriesConf.data.map((ddd) => ddd[catHead]);
    // const yDomain = seriesConf.data.map((ddd) => ddd.category);
      // NOTE: rangebands for bar charts are 'top-to-bottom', unlike
      // other components that run 'bottom-to-top'. This relates to
      // sorting...
    // Rangeband gaps:
    const rbGaps = this.getRangeBandGaps(config.bounds.height, seriesConf.pointCount);
    config.yScale = Dthree.scale.ordinal()
      .rangeBands([ 0, config.bounds.height ], rbGaps.inner, rbGaps.outer)
      .domain(yDomain);
    return config;
  }
  // CONFIG SERIES BARS ends

  // CONFIG LEGEND
  // Assemple config object to pass to SilverLegend
  configLegend(rawConfig) {
    // I want an array of objects with props: string and colour
    const legendArray = [];
    // Colours from component lookup, based on the number of series:
    const colourSet = barProperties.series.seriesColours[rawConfig.seriesCount - 1];
    for (let i = 1; i < rawConfig.headers.length; i++) {
      const temp = {};
      temp.string = (rawConfig.headers[i]);
      temp.colour = colourSet[i - 1];
      legendArray.push(temp);
    }
    const config = {
      bounds: this.state.bounds,
      duration: rawConfig.duration,
      firstRender: this.state.checkMargins,
      legendArray,
      seriesCount: rawConfig.seriesCount,
    };
    return config;
  }
  // CONFIG LEGEND ends

  // GET RANGE BANDS
  // Called from configSeriesBars/YAxis to calculate a D3-complient
  // % (of 1) value for gaps...
  getRangeBandGaps(height, pointCount) {
    const inner = (1 / (height / pointCount)) * this.props.config.gap;
    const outer = inner / 2;
    return { inner, outer };
  }
  // GET RANGE BANDS

  // SET BOUNDS
  // Called from all D3-component config-assemblers to generate the
  // bounds object
  setBounds(dimensions) {
    // Bounds is an object with 4 properties: inner box height and width...
    // debugger;
    const bounds = {};
    bounds.height = dimensions.innerbox.height;
    bounds.width = dimensions.innerbox.width;
    // ... and top and left positions:
    bounds.top = dimensions.margins.top;
    bounds.left = dimensions.margins.left;
    return bounds;
  }
  // SET BOUNDS ends

  //
  // =========================
  // Event handlers and others:
  // =========================

  // MAIN D3 GROUP TRANSITION
  // Called from (componentDidMount -- actually, not any more and) componentDidUpdate
  // On 2nd render only, after adjustments have been made to the background elements
  // (strings and legand)
  // Animates main D3 group to position
  // NB: This isn't interested in mainGroup *size* -- only in location
  mainDthreeGroupTransition(duration) {
    const config = this.props.config;
    const margins = config.dimensions.margins;
    const bLeft = margins.left;
    const bTop = margins.top;
    const transStr = `translate(${bLeft}, ${bTop})`;
    const mainGroup = Dthree.select('.chart-main-group');
    mainGroup.transition().duration(duration).attr('transform', transStr);
    // And legend group...
    if (config.seriesCount > 1) {
      const legTop = config.dimensions.legendTop;
      const legTransStr = `translate(${bLeft}, ${legTop})`;
      const legendGroup = Dthree.select('.chart-legend-group');
      legendGroup.transition().duration(duration).attr('transform', legTransStr);
    }
  }
  // Because of the double-render, the above can only be called on an update (I think!)

  // CATCH BAR EVENT
  // Fields events on barchart bars. The incoming object
  // is initially constructed as:
  /*
    {
      data: {category-string, value(s)-by-name},
      index: number
    }
  */
  // I assume this gets dealt with here. Is there
  // any reason why it would get passed up the tree...?
  catchBarEvent(eventObj) {
    /* eslint-disable no-console */
    console.log(eventObj.data);
  }

  getStyle() {
    return this.state.config.dimensions;
  }

  // RENDER
  render() {
    const config = this.state.config;
    config.duration = this.state.duration;
    // Custom config objects for the various d3 components:
    const xAxisConfig = this.configXaxis(config);
    const yAxisConfig = this.configYaxis(config);
    const seriesBarsConfig = this.configSeriesBars(config);
    const legendConfig = this.configLegend(config);

    // NOTE: svg-wrapper has explicit width and height
    // Does this require further attention...?
    const dimensions = config.dimensions;
    const width = dimensions.outerbox.width;
    const height = dimensions.outerbox.height;
    // Define the SVG...
    const svgElements = (
      <svg
        className="svg-wrapper" ref="svgwrapper"
        width={width} height={height}
      >
        <SilverChartMargins config={config}/>
        <SilverLegend config={legendConfig}/>
        <g className="chart-main-group">
          <SilverXaxis config={xAxisConfig}/>
          <SilverYaxis config={yAxisConfig}/>
          <SilverSeriesBar
            config={seriesBarsConfig}
            passBarClick={this.catchBarEvent.bind(this)}
          />
        </g>
      </svg>
    );
    return svgElements;
  }
}
