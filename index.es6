import React from 'react';
import ReactDom from 'react-dom';
import Dthree from 'd3';
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

  // COMPONENT WILL MOUNT: adjust dimensions for number of bars...
  componentWillMount() {
    // Function returns *just* inner box height. This doesn't (yet)
    // allow for scale depth...
    const innerBoxHeight = this.getInnerBoxHeight();
    const config = this.props.config;
    // Overall chart depth is arbitrary, for now:
    config.dimensions.height = innerBoxHeight + 80;
    config.bounds.height = innerBoxHeight;
    this.setState({ config });
  }

  // Invoked after initial mount
  componentDidMount() {
    this.mainDthreeGroupTransition();
  }

  // COMPONENT WILL RECEIVE PROPS
  // Invoked when new props are received AFTER initial render
  componentWillReceiveProps(newProps) {
    // Responds to request to get svg content
    if (newProps.getSvg) {
      // Gather up the SVG here...
      const svgNode = ReactDom.findDOMNode(this.refs.svgwrapper);
      const svgContent = svgNode.innerHTML;
      this.props.passSvg(svgContent);
      // And to pre-empt re-render:
      return false;
    }
    const innerBoxHeight = this.getInnerBoxHeight();
    const config = this.props.config;
    // Overall chart depth is arbitrary, for now:
    config.dimensions.height = innerBoxHeight + 80;
    config.bounds.height = innerBoxHeight;
    this.setState({
      // This.setState doesn't force a premature render in this context.
      // So I'm just using this to force use of inherited duration ofter
      // initial has used default zero...
      duration: newProps.config.duration,
      config,
    });
  }

  // Invoked after post-initial renders
  componentDidUpdate() {
    this.mainDthreeGroupTransition();
  }

  //
  // ==================================
  // D3 component configuration objects:
  // ==================================

  // CONFIG X-AXIS
  // Assembles x-axis config object with properties:
  // duration, bounds, orient, scale
  configXaxis(xConf) {
    const bounds = xConf.bounds;
    const xAxisConfig = {
      duration: xConf.duration,
      bounds,
      orient: xConf.xOrient,
    };
    // Assemble the x-scale object
    xAxisConfig.scale = Dthree.scale.linear()
      .range([ 0, bounds.width ])
      .domain(xConf.xDomain);
    return xAxisConfig;
  }
  // CONFIG X-AXIS ends

  // CONFIG Y-AXIS
  // Assembles y-axis config object
  configYaxis(yConf) {
    // Default: duration, bounds and orient
    const bounds = yConf.bounds;
    const yAxisConfig = {
      duration: yConf.duration,
      bounds,
      orient: yConf.yOrient,
      tickSize: 0,
    };
    // Assemble the y-scale object
    const yDomain = yConf.data.map((ddd) => ddd.category);
      // NOTE: rangebands for bar charts are 'top-to-bottom', unlike
      // other components that run 'bottom-to-top'. This relates to
      // sorting...
    yAxisConfig.scale = Dthree.scale.ordinal()
      .rangeBands([ 0, bounds.height ], 0.1)
      .domain(yDomain);
    return yAxisConfig;
  }
  // CONFIG Y-AXIS ends

  // CONFIG SERIES BARS
  // Assembles bar series config object
  configSeriesBars(seriesConf) {
    // Default: duration, bounds and orient
    const bounds = seriesConf.bounds;
    const config = {
      duration: seriesConf.duration,
      bounds,
    };
    // Assemble the x-scale object
    config.xScale = Dthree.scale.linear()
      .range([ 0, bounds.width ])
      .domain(seriesConf.xDomain);
    // And the data:
    config.data = seriesConf.data;
    // Assemble the y-scale object
    const yDomain = seriesConf.data.map((
      ddd) => ddd.category);
      // NOTE: rangebands for bar charts are 'top-to-bottom', unlike
      // other components that run 'bottom-to-top'. This relates to
      // sorting...
    config.yScale = Dthree.scale.ordinal()
      .rangeBands([ 0, bounds.height ], 0.1)
      .domain(yDomain);
    return config;
  }
  // CONFIG SERIES BARS ends

  //
  // =========================
  // Event handlers and others:
  // =========================

  // MAIN D3 GROUP TRANSITION
  // Called from componentDidMount and componentDidUpdate
  // Animates main D3 group to position
  mainDthreeGroupTransition() {
    const config = this.props.config;
    const bLeft = config.bounds.left;
    const bTop = config.bounds.top;
    const transStr = `translate(${bLeft}, ${bTop})`;
    const mainGroup = Dthree.select('.chart-main-group');
    mainGroup.transition().duration(config.duration).attr('transform', transStr);
  }

  // CATCH BAR EVENT
  // Fields events on barchart bars. The incoming object
  // is initially constructed as:
  /*
    {
      data: {category, value},
      index: number
    }
  */
  // I assume this gets dealt with here. Is there
  // any reason why it would get passed up the tree...?
  catchBarEvent(eventObj) {
    console.log(eventObj);
  }

  // SET BAR CHART Height
  // Called from ???; returns chart's inner height
  // (i.e. height of the inner box)
  // according to the number of bars,
  // and (eventually) other chart peculiarities (clusters, overlapping...)
  getInnerBoxHeight() {
    const config = this.props.config;
    // Number of bars ('- 1' to exclude headers)
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
    const oneBarHeight = depthsArray[seriesCount];
    // ...and height of all bars together
    let innerBoxHeight = oneBarHeight * pointCount;
    // Adjust for overlapping
    // (I've lifted this straight from my old Excel code. Frankly,
    // I don't understand it any more...)
    if (chartStyle.includes('overlap')) {
      innerBoxHeight -= oneBarHeight;
      innerBoxHeight -= ((oneBarHeight / 2) * (seriesCount - 1));
    }
    // Now allow for gaps, and return...
    innerBoxHeight += (gapHeight * (seriesCount - 1));
    return innerBoxHeight;
  }

  getStyle() {
    return this.state.config.dimensions;
  }

  // RENDER
  render() {
    const config = this.state.config;
    config.duration = this.state.duration;
    // Config objects for the various d3 components:
    const xAxisConfig = this.configXaxis(config);
    const yAxisConfig = this.configYaxis(config);
    const seriesBarsConfig = this.configSeriesBars(config);
    // For exported SVG, chart background fill rect must have calculated size:
    const dimensions = config.dimensions;
    const xVal = 0;
    const yVal = 0;
    const width = dimensions.width;
    const height = dimensions.height;
    const backFill = (
      <rect
        className="chart-d3-background-fill"
        x={xVal} y={yVal}
        width={width} height={height}
      />
    );
    //
    // Both of these precipitated the 'Mutating style is deprecated' warning...
    //    <svg className="svg-wrapper" ref="svgwrapper" style={{this.state.config.dimensions}}>
    //    <svg className="svg-wrapper" ref="svgwrapper" style={this.getStyle()}>
    // But I seem to get round it by using SVG non-style properties...
    return (
      <svg className="svg-wrapper" ref="svgwrapper"
        width={width} height={height}
      >
        {backFill}
        <g className="chart-main-group">
          <SilverXaxis config={xAxisConfig}/>
          <SilverYaxis config={yAxisConfig}/>
          <SilverSeriesBar
            config={seriesBarsConfig}
            passBarClick={this.catchBarEvent.bind(this)}
          />
        </g>
        <SilverChartMargins config={config}/>
      </svg>
    );
  }
}
