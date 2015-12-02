import React from 'react';
import ReactDom from 'react-dom';
import Dthree from 'd3';
// D3 components:
import SilverXaxis from '@economist/component-silver-xaxis';
import SilverYaxis from '@economist/component-silver-yaxis';
import SilverSeriesBar from '@economist/component-silver-series-bar';
import SilverChartMargins from '@economist/component-silver-chartmargins';

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
      // Duration defaults to zero for initial render.
      // Thereafter, componentWillReceiveProps overwrites
      // with inherited duration
      duration: 0,
      // checkMargins flag is true to force stringwidth check
      checkMargins: true,
      // config:
      config: props.config,
    };
  }

  // COMPONENT WILL MOUNT: adjust dimensions/bounds for number of bars...
  componentWillMount() {
    // Fix later (because in ESLint this whopper overshadows all other errors)
    // const config = { ...this.props.config};
    const config = this.props.config;
    // Function returns amount by which to tweak chart height (inner and outer)
    const heightAdjust = this.adjustForBarCount(config);
    config.dimensions.outerbox.height += heightAdjust;
    config.dimensions.innerbox.height += heightAdjust;
    // Now calculate the D3 bounds
    const bounds = this.setBounds(config.dimensions);
    this.setState({ config, bounds });
  }

  // COMPONENT DID MOUNT
  // Originally, invoked after initial mount, to move D3 group into position.
  // Now that the double-render occurs, the 'else' case is redundant since,
  // by definition, checkMargins=true on mount.
  // Left in for now...
  componentDidMount() {
    if (this.state.checkMargins) {
      // On this, see: https://github.com/react-bootstrap/react-bootstrap/issues/494
      // Legit to set state in componentDidMount...?
      /* eslint-disable react/no-did-mount-set-state */
      // this.setState({ checkMargins: false });
      // Moved to separate function anyway...
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
    // Fix later: leave for now because it conceals other potential errors
    // const config = { ...newProps.config };
    const config = newProps.config;
    // For debugging:
    // this.reportDimensions('componentWillReceiveProps', config.dimensions);
    // Function returns amount by which to tweak chart height (inner and outer)
    const heightAdjust = this.adjustForBarCount(config);
    config.dimensions.outerbox.height += heightAdjust;
    config.dimensions.innerbox.height += heightAdjust;
    // console.log('componentWillReceiveProps ends with overall height: ' + config.dimensions.outerbox.height);
    // Now calculate the D3 bounds
    const bounds = this.setBounds(config.dimensions);
    this.setState({
      // This.setState doesn't force a premature render in this context.
      // So I'm just using this to force use of inherited duration ofter
      // initial has used default zero...
      duration: newProps.config.duration,
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
    // const config = this.state.config;
    // this.reportDimensions('componentDidUpdate', config.dimensions);
    const duration = this.state.duration;
    if (this.state.checkMargins) {
      // On this, see: https://github.com/react-bootstrap/react-bootstrap/issues/494
      // Legit to set state in componentDidMount...?
      /* eslint-disable react/no-did-update-set-state */
      this.checkStringWidths();
    } else {
      this.mainDthreeGroupTransition(duration);
    }
  }
  /*  How flakey is this?
      The danger is of an infinite loop.
      I want to render only twice:
      1) checkMargins=true -- do the checks and adjust the state:
          reset dimensions / bounds
          set checkMargins=false, to precipitate re-render
      2) checkMargins=false -- draw the real stuff on the page
          The 2nd render occurs and we find ourselves back here, where
          we draw up the D3 with the new state.config properties...
          Nothing then happens to precipitate a re-render
          checkMargins is left 'false'...
      ...until the arrival of new props, with I reset checkMargins=false
      and start the whole rigmarole off again...
  */

  // REPORT DIMENSIONS
  // is a debugging function, called from various situations
  // and eventually deletable...
  reportDimensions(situation, dims) {
    const outerheight = dims.outerbox.height;
    const topMarg = dims.margins.top;
    const bottomMarg = dims.margins.bottom;
    const innerheight = dims.innerbox.height;
    let msg = `${situation}: `;
    msg += `outerbox height=${outerheight}; `;
    msg += `top margin=${topMarg}; `;
    msg += `bottom margin=${bottomMarg}; `;
    msg += `innerbox height=${innerheight}`;
    // console.log(msg);
  }
  // REPORT DIMENSIONS ends

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
  // NOTE: this eventually (probably) moves up to ChartWrapper and gets
  // passed into all style components as a prop... (May need a parameter,
  //  or even to split into 2 separate functions, according to style...)
  checkStringWidths() {
    // console.log('checkStringWidths');
    const config = this.state.config;
    // Context
    const svgNode = Dthree.select('.svg-wrapper');
    // Cumulative extra height for top margin
    let topExtraHeight = 0;
    // +++ Title
    // Temp height adjustment for 'current' string. Reset for each string.
    let tempExtraHeight = config.strings.title.leading;
    let tSpanLen = Dthree.select('.silver-d3-title-string').node().children.length - 1;
    tempExtraHeight *= tSpanLen;
    // Tweak subtitle position with extra height added for title
    config.strings.subtitle.y += tempExtraHeight;
    topExtraHeight += tempExtraHeight;
    // +++ Subtitle
    tempExtraHeight = config.strings.subtitle.leading;
    tSpanLen = Dthree.select('.silver-d3-subtitle-string').node().children.length - 1;
    tempExtraHeight *= tSpanLen;
    topExtraHeight += tempExtraHeight;
    // Tweak inner box top with extra height so far...
    // Inner box height doesn't change. Outer box height doesn't change yet...
    config.dimensions.margins.top += topExtraHeight;
    // Cumulative extra height for bottom margin
    let bottomExtraHeight = 0;
    // +++ Source
    tempExtraHeight = config.strings.source.leading;
    tSpanLen = Dthree.select('.silver-d3-source-string').node().children.length - 1;
    tempExtraHeight *= tSpanLen;
    // Source moves UP from bottom
    config.strings.source.y -= tempExtraHeight;
    bottomExtraHeight += tempExtraHeight;
    // For now, I'm leaving the footnote...
    // So there's be a bit more code to deal with that, once we've decided
    // what the source and footnote do...
    //
    // So now we have a cumulative extra height
    config.dimensions.margins.bottom += bottomExtraHeight;
    config.dimensions.outerbox.height += (topExtraHeight + bottomExtraHeight);
    //
    // +++ Longest bar chart category:
    // Text object
    const testText = svgNode.append('text')
      .attr('id', 'testText')
      ;
    // String is in config:
    let testStr = config.longestCatString;
    testText
      .attr('class', 'd3-yaxis-check')
      .text(testStr);
    // Width of text + the 5pt gap which is also HARD-CODED into xaxis
    let tWidth = testText.node().getComputedTextLength() + 5;
    // Update the bounds
    config.dimensions.margins.left += tWidth;
    config.dimensions.innerbox.width -= tWidth;
    // +++ Last string on x-axis
    testStr = String(config.minmax.max);
    // Crudely for now: if it's > 1,000, add a comma to the string!
    // Don't forget decimal points, too!! But also see Evernote on
    // D3's handling of axis ticks...
    if (parseInt(testStr, 10) >= 1000000) {
      // Basically, this is crap! But for now...
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
    const xAxisConfig = {
      duration: xConf.duration,
      bounds: this.state.bounds,
      orient: xConf.xOrient,
      ticks: xConf.minmax.ticks,
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
    // Default: duration, bounds and orient
    const yAxisConfig = {
      duration: yConf.duration,
      bounds: this.state.bounds,
      orient: yConf.yOrient,
      tickSize: 0,
    };
    // Assemble the y-scale object
    // Get category column header, to identify each cat string in data:
    const catHead = yConf.headers[0];
    const yDomain = yConf.data.map((ddd) => ddd[catHead]);
      // NOTE: rangebands for bar charts are 'top-to-bottom', unlike
      // other components that run 'bottom-to-top'. This relates to
      // sorting...
    yAxisConfig.scale = Dthree.scale.ordinal()
      .domain(yDomain)
      .rangeBands([ 0, this.state.bounds.height ], 0.25, 0.25);
    return yAxisConfig;
  }
  // CONFIG Y-AXIS ends

  // CONFIG SERIES BARS
  // Assembles bar series config object
  configSeriesBars(seriesConf) {
    const config = {
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
    // Assemble the y-scale object
    // Get category column header, to identify each cat string in data:
    const catHead = seriesConf.headers[0];
    const yDomain = seriesConf.data.map((ddd) => ddd[catHead]);
    // const yDomain = seriesConf.data.map((ddd) => ddd.category);
      // NOTE: rangebands for bar charts are 'top-to-bottom', unlike
      // other components that run 'bottom-to-top'. This relates to
      // sorting...
      // NOTE too that the rangeband setting is dup'd in configYAxis,
      // which is stupid
    config.yScale = Dthree.scale.ordinal()
      .rangeBands([ 0, this.state.bounds.height ], 0.25, 0.25)
      .domain(yDomain);
    return config;
  }
  // CONFIG SERIES BARS ends

  // SET BOUNDS
  // Called from all D3-component config-assemblers to generate the
  // bounds object
  setBounds(dimensions) {
    // Bounds is an object with 4 properties: inner box height and width...
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
  // Animates main D3 group to position
  mainDthreeGroupTransition(duration) {
    const margins = this.props.config.dimensions.margins;
    const bLeft = margins.left;
    const bTop = margins.top;
    const transStr = `translate(${bLeft}, ${bTop})`;
    const mainGroup = Dthree.select('.chart-main-group');
    mainGroup.transition().duration(duration).attr('transform', transStr);
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

  // ADJUST FOR BAR COUNT
  // Called from componentWillMount and componentWillReceiveProps
  // Calculates chart's inner-box height (according to the number of bars
  // and - eventually - other chart peculiarities (clusters, overlapping...)
  // Returns amount by which chart height changes (inner and outer boxes)
  adjustForBarCount(config) {
    // console.log('adjustForBarCount starts with overall height: ' + config.dimensions.outerbox.height);
    // Number of bars ('- 1' to exclude headers)
    const originalInnerBoxHeight = config.dimensions.innerbox.height;
    const pointCount = config.pointCount;
    // Number of traces: number of 'value' elements in first data item
    let seriesCount = config.seriesCount;
    // Chart style: this could be 'sidebyside', 'stacked', or 'overlap'
    // Hard-coded for now...
    const chartStyle = 'sidebyside';
    // If bars are stacked, that counts, for this function's purposes, as
    // a single trace:
    if (chartStyle === 'stacked') {
      seriesCount = 1;
    }
    // Hard-coded (for now) array of depths to use if bars are side-by-side.
    // Up to a maximum of four traces, sets cluster-width val. So if there's
    // just one trace, each bar is 8pts high; if there are 4 (or more) traces,
    // each cluster is 20px high...
    // *** ANOTHER ITEM TO GO INTO A GENERAL PREFS FILE ***
    const depthsArray = [ 8, 14, 18, 20 ];
    // Gap height: another one for the prefs file
    const gapHeight = 5;
    // We only calculate for up to 4 traces (ie, above 4, just squeeze)
    if (seriesCount > depthsArray.length) {
      seriesCount = depthsArray.length - 1;
    }
    // debugger;
    // So: height of one cluster
    const oneBarHeight = depthsArray[seriesCount - 1];
    // ...and height of all bars together
    let innerBoxHeight = oneBarHeight * pointCount;
    // Adjust for overlapping
    // (I've lifted this straight from my old Excel code. Frankly,
    // I don't understand it any more...)
    // Firefox doesn't like 'includes', so:
    if (chartStyle.search('overlap') >= 0) {
      innerBoxHeight -= oneBarHeight;
      innerBoxHeight -= ((oneBarHeight / 2) * (seriesCount - 1));
    }
    // Now allow for gaps, and return...
    innerBoxHeight += (gapHeight * (pointCount - 1));
    const returnedHeight = innerBoxHeight - originalInnerBoxHeight;
    // console.log('Returned height of ' + returnedHeight);
    return returnedHeight;
  }

  getStyle() {
    return this.state.config.dimensions;
  }

  // RENDER
  render() {
    const config = this.state.config;
    if (this.state.checkMargins) {
      // this.reportDimensions('First render', config.dimensions );
    } else {
      // this.reportDimensions('Second render', config.dimensions);
    }
    config.duration = this.state.duration;
    // Config objects for the various d3 components:
    const xAxisConfig = this.configXaxis(config);
    const yAxisConfig = this.configYaxis(config);
    const seriesBarsConfig = this.configSeriesBars(config);
    // Outer dimensions of the chart background fill
    const dimensions = config.dimensions;

    // NOTE on the svg-wrapper. I used to explicitly set dimensions with:
    //    width={width} height={height}
    // But I've removed that. The assumption has to be, however, that there
    // MUST be a 100% width/height BACKGROUND BOX, to force SVG size...
    //    I set {width} and {height} with:
    //    const width = dimensions.outerbox.width;
    //    const height = dimensions.outerbox.height;

    /*
    // For exported SVG, chart background fill rect must have calculated size:
    const xVal = 0;
    const yVal = 0;
          <rect
            className="chart-d3-backbox-main"
            x={xVal} y={yVal}
            width={width} height={height}
          />
    */
    // Comm'd out 'first' render will throw down strings for measurement:
    // let svgElements = <svg className="svg-wrapper" ref="svgwrapper"/>;
    // Second render will construct entire D3 edifice:
    // +++ actually, both renders now +++
    //    Background rect
    //    Inner box content components
    //    Outer-box strings component
    // if (!this.state.checkMargins) {
    // checkMargins is true on 'test' render; false on 'real' render...

    const svgElements = (
      <svg
        className="svg-wrapper" ref="svgwrapper"
      >
        <SilverChartMargins config={config}/>
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
    // }

    //
    // Both of these precipitated the 'Mutating style is deprecated' warning...
    //    <svg className="svg-wrapper" ref="svgwrapper" style={{this.state.config.dimensions}}>
    //    <svg className="svg-wrapper" ref="svgwrapper" style={this.getStyle()}>
    // But I seem to get round it by using SVG non-style properties...

    // And the original pre-conditional return:
    // return (
    //   <svg className="svg-wrapper" ref="svgwrapper"
    //     width={width} height={height}
    //   >
    //     {backFill}
    //     <g className="chart-main-group">
    //       <SilverXaxis config={xAxisConfig}/>
    //       <SilverYaxis config={yAxisConfig}/>
    //       <SilverSeriesBar
    //         config={seriesBarsConfig}
    //         passBarClick={this.catchBarEvent.bind(this)}
    //       />
    //     </g>
    //     <SilverChartMargins config={config}/>
    //   </svg>
    // );

    // Now returns JSX defined above...
    return svgElements;
  }
}
