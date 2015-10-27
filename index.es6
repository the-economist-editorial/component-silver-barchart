import React from 'react';
import Dthree from 'd3';
import SilverXaxis from '@economist/component-silver-xaxis';
import SilverYaxis from '@economist/component-silver-yaxis';
import SilverSeriesBar from '@economist/component-silver-series-bar';

export default class SilverBarChart extends React.Component {

  // PROP TYPES
  static get propTypes() {
    return {
      test: React.PropTypes.string,
      config: React.PropTypes.object.isRequired,
      getSvg: React.PropTypes.bool,
      passSvg: React.PropTypes.func,
    };
  }

  // DEFAULT PROPS
  static get defaultProps() {
    return {
      config: {
        'context': 'print',
        'data': [
          { 'category': 'Twenty', 'value': 20 },
          { 'category': 'Forty', 'value': 40 },
          { 'category': 'Seventy', 'value': 70 },
          { 'category': 'Eighty', 'value': 80 },
        ],
        'dimensions': { 'width': 500, 'height': 300 },
        'duration': 0,
        'margins': { 'top': 30, 'right': 30, 'bottom': 30, 'left': 60 },
        'xDomain': [ 0, 80 ],
        'yDomain': [],
        'xOrient': 'bottom',
        'yOrient': 'left',
        'style': 'bars',
        bounds: { 'left': 50, 'top': 50, 'width': 500, 'height': 150 },
      },
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

  //
  // =======================
  // React lifecycle methods:
  // =======================

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
      const svgNode = React.findDOMNode(this.refs.svgwrapper);
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
    eventObj += 'OK';
  }
  // ========== COMM'D OUT FOR LINTING ==========

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
      // <div className="bar-chart-wrapper">
      // </div>
        // <svg className="svg-wrapper" ref="svgwrapper">
        // </svg>
            // <rect className="chart-main-fill"/>
    return (
      <g className="chart-main-group">
        <SilverXaxis config={xAxisConfig}/>
        <SilverYaxis config={yAxisConfig}/>
        <SilverSeriesBar
          config={seriesBarsConfig}
          passBarClick={this.catchBarEvent.bind(this)}
        />
      </g>
    );
  }
}
