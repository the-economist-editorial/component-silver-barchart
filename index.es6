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
    // Pack state:
    this.state = {
      // Duration defaults to zero for initial render.
      // Thereafter, componentWillReceiveProps overwrites
      // with inherited duration
      duration: 0,
    };
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
    this.setState({
      // This.setState doesn't force a premature render in this context.
      // So I'm just using this to force use of inherited duration ofter
      // initial has used default zero...
      duration: newProps.config.duration,
      // duration: 1000,
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
    /* eslint-disable id-length */
    const yDomain = yConf.data.map((d) => d.category);
      // NOTE: rangebands for bar charts are 'top-to-bottom', unlike
      // other components that run 'bottom-to-top'. This relates to
      // sorting...
    yAxisConfig.scale = Dthree.scale.ordinal()
      .rangeBands([ 0, bounds.height ], 0.1)
      .domain(yDomain);

    return yAxisConfig;
  }

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
      d) => d.category);
    // Was:
    // const yDomain = seriesConf.data.map(function (d) {
    //   return d.category;
    // })
      // NOTE: rangebands for bar charts are 'top-to-bottom', unlike
      // other components that run 'bottom-to-top'. This relates to
      // sorting...
    config.yScale = Dthree.scale.ordinal()
      .rangeBands([ 0, bounds.height ], 0.1)
      .domain(yDomain);
    return config;
  }

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
    // To stop the linter annoying me...
    eventObj += 'OK';
    console.log(eventObj);
  }

  // RENDER
  render() {
    const config = this.props.config;
    // Overwrite duration: this allows me to force zero duration
    // at initial render...
    config.duration = this.state.duration;
    // Config objects for the various d3 components:
    const xAxisConfig = this.configXaxis(config);
    const yAxisConfig = this.configYaxis(config);
    const seriesBarsConfig = this.configSeriesBars(config);
    // For exported SVG, chart backfill must have calculated size:
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
    return (
      <svg className="svg-wrapper" ref="svgwrapper">
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
