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
    // Function returns *just* inner box height.
    const innerBoxHeight = this.getInnerBoxHeight(config);
    // Overall chart depth is ARBITRARY, for now. In the wild,
    // this should be calculated from outer-box string positions
    // and margins...
    // *** Worse still, I'm doing this again in componentWillReceiveProps ***
    config.dimensions.height = innerBoxHeight + 65;
    // Note, too, that bounds.height should also be increased to
    // allow for height of x-axis...
    config.bounds.height = innerBoxHeight;
    this.setState({ config });
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
    // else {
    //   console.log('second render by componentDidMount');
    //   this.mainDthreeGroupTransition();
    // }
  }

  // COMPONENT WILL RECEIVE PROPS
  // Invoked when new props are received AFTER initial render
  componentWillReceiveProps(newProps) {
    // Responds to request to get svg content
    if (newProps.getSvg) {
      // Gather up the SVG here...
      const svgNode = ReactDom.findDOMNode(this.refs.svgwrapper);
      const svgContent = svgNode.innerHTML;
      newProps.passSvg(svgContent);
      // And to pre-empt re-render:
      return false;
    }
    // Fix later
    // const config = { ...newProps.config };
    const config = newProps.config;
    const innerBoxHeight = this.getInnerBoxHeight(config);
    // Overall chart depth is arbitrary, for now:
    config.dimensions.height = innerBoxHeight + 65;
    config.bounds.height = innerBoxHeight;
    this.setState({
      // This.setState doesn't force a premature render in this context.
      // So I'm just using this to force use of inherited duration ofter
      // initial has used default zero...
      duration: newProps.config.duration,
      // ...and to reset chart depth:
      config,
      // ...and to force new first/2nd render cycle:
      checkMargins: true,
    });
  }

  // Invoked after post-initial renders
  componentDidUpdate() {
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

    // Param is config object
    // Returns revised background property
    resetConfigBackground(config) {
      const bConfig = config.background;
      const height = config.dimensions.height;
      const width = config.dimensions.width;
      for (const i in bConfig) {
        const bItem = bConfig[i];
        if (bItem.adjustable.height) {
          bItem.height = height;
        }
        if (bItem.adjustable.width) {
          bItem.width = width;
        }
      }
      return bConfig;
    }

  // CHECK STRING WIDTHS
  // Called from componentDidMount/Update
  // For TITLE and SUBTITLE, checks string width against chart width;
  // if too long, substitutes warning string. But should eventually
  // work out a point to turn the line and tweak chart depth
  // SOURCE & FOOTNOTE omitted for now
  // Adjusts left margin to longest CATEGORY string length
  // Adjusts right margin for last xaxis label
  checkStringWidths() {
    const config = this.state.config;
    const originalWidth = config.bounds.width;
    // Context
    const svgNode = Dthree.select('.svg-wrapper');
    // Text object
    const testText = svgNode.append('text')
      .attr('id', 'testText')
      ;
    // +++ Title
    let testStr = config.strings.title.content;
    testText
      .attr('class', 'silver-d3-title-check')
      .text(testStr);
    let tWidth = testText.node().getComputedTextLength();
    if (tWidth > originalWidth) {
      config.strings.title.content = 'Too long to display';
    }
    // +++ Subtitle
    testStr = config.strings.subtitle.content;
    // If I want to demo:
    // testStr += ' with extra stuff for testing';
    testText
      .attr('class', 'silver-d3-subtitle-check')
      .text(testStr);
    tWidth = testText.node().getComputedTextLength();
    if (tWidth > originalWidth) {
      config.strings.subtitle.content = 'Too long to display';
    }
    // +++ Longest bar chart category:
    // String is in config:
    testStr = config.longestCatString;
    testText
      .attr('class', 'd3-yaxis-check')
      .text(testStr);
    // Width of text + the 5pt gap which is also Hard-coded into xaxis
    tWidth = testText.node().getComputedTextLength() + 5;
    // Update the bounds
    config.bounds.left += tWidth;
    config.bounds.width -= tWidth;
    // +++ Last string on x-axis
    testStr = config.xDomain[1];
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
    config.bounds.width -= (tWidth / 2);
    // All done: clear the text object...
    testText.remove();

    // Reset background elements:
    config.background = this.resetConfigBackground(config);

    // ...and precipitate 2nd render with new margin settings
    this.setState({
      checkMargins: false,
      config,
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
    xAxisConfig.checkMargins = this.state.checkMargins;
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
      .domain(yDomain)
      .rangeBands([ 0, bounds.height ], 0.25, 0.25);
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
      .rangeBands([ 0, bounds.height ], 0.25, 0.25)
      .domain(yDomain);
    return config;
  }
  // CONFIG SERIES BARS ends

  //
  // =========================
  // Event handlers and others:
  // =========================

  // MAIN D3 GROUP TRANSITION
  // Called from (componentDidMount -- actually, not any more and) componentDidUpdate
  // Animates main D3 group to position
  mainDthreeGroupTransition(duration) {
    const config = this.props.config;
    const bLeft = config.bounds.left;
    const bTop = config.bounds.top;
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
    console.log(eventObj.data);
  }

  // SET BAR CHART Height
  // Called from ???; returns chart's inner height
  // (i.e. height of the inner box)
  // according to the number of bars,
  // and (eventually) other chart peculiarities (clusters, overlapping...)
  // (Pass in config, since this can be called from componentWillMount
  // or componentWillReceiveProps)
  getInnerBoxHeight(config) {
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
    const dimensions = config.dimensions;
    const width = dimensions.width;
    const height = dimensions.height;

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
        width={width} height={height}
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
