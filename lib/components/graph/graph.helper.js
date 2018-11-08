'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.updateNodeHighlightedValue = exports.initializeGraphState = exports.checkForGraphElementsChanges = exports.checkForGraphConfigChanges = exports.buildNodeProps = exports.buildLinkProps = undefined;

var _extends =
    Object.assign ||
    function(target) {
        for (var i = 1; i < arguments.length; i++) {
            var source = arguments[i];
            for (var key in source) {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    target[key] = source[key];
                }
            }
        }
        return target;
    }; /**
 * @module Graph/helper
 * @description
 * Offers a series of methods that isolate logic of Graph component and also from Graph rendering methods.
 */
/**
 * @typedef {Object} Link
 * @property {string} source - the node id of the source in the link.
 * @property {string} target - the node id of the target in the link.
 * @memberof Graph/helper
 */
/**
 * @typedef {Object} Node
 * @property {string} id - the id of the node.
 * @property {string} [color=] - color of the node (optional).
 * @property {string} [fontColor=] - node text label font color (optional).
 * @property {string} [size=] - size of the node (optional).
 * @property {string} [symbolType=] - symbol type of the node (optional).
 * @property {string} [svg=] - custom svg for node (optional).
 * @memberof Graph/helper
 */

var _d3Force = require('d3-force');

var _graph2 = require('./graph.const');

var _graph3 = _interopRequireDefault(_graph2);

var _graph4 = require('./graph.config');

var _graph5 = _interopRequireDefault(_graph4);

var _err = require('../../err');

var _err2 = _interopRequireDefault(_err);

var _utils = require('../../utils');

var _utils2 = _interopRequireDefault(_utils);

var _link = require('../link/link.helper');

var _marker = require('../marker/marker.helper');

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
}

function _defineProperty(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true });
    } else {
        obj[key] = value;
    }
    return obj;
}

var NODE_PROPS_WHITELIST = ['id', 'highlighted', 'x', 'y', 'index', 'vy', 'vx'];

/**
 * Create d3 forceSimulation to be applied on the graph.<br/>
 * {@link https://github.com/d3/d3-force#forceSimulation|d3-force#forceSimulation}<br/>
 * {@link https://github.com/d3/d3-force#simulation_force|d3-force#simulation_force}<br/>
 * Wtf is a force? {@link https://github.com/d3/d3-force#forces| here}
 * @param  {number} width - the width of the container area of the graph.
 * @param  {number} height - the height of the container area of the graph.
 * @param  {number} gravity - the force strength applied to the graph.
 * @returns {Object} returns the simulation instance to be consumed.
 * @memberof Graph/helper
 */
function _createForceSimulation(width, height, gravity) {
    var frx = (0, _d3Force.forceX)(width / 2).strength(_graph3.default.FORCE_X);
    var fry = (0, _d3Force.forceY)(height / 2).strength(_graph3.default.FORCE_Y);
    var forceStrength = gravity;

    return (0, _d3Force.forceSimulation)()
        .force('charge', (0, _d3Force.forceManyBody)().strength(forceStrength))
        .force('x', frx)
        .force('y', fry);
}

/**
 * Get the correct node opacity in order to properly make decisions based on context such as currently highlighted node.
 * @param  {Object} node - the node object for whom we will generate properties.
 * @param  {string} highlightedNode - same as {@link #buildGraph|highlightedNode in buildGraph}.
 * @param  {Object} highlightedLink - same as {@link #buildGraph|highlightedLink in buildGraph}.
 * @param  {Object} config - same as {@link #buildGraph|config in buildGraph}.
 * @returns {number} the opacity value for the given node.
 * @memberof Graph/helper
 */
function _getNodeOpacity(node, highlightedNode, highlightedLink, config) {
    var highlight =
        node.highlighted ||
        node.id === (highlightedLink && highlightedLink.source) ||
        node.id === (highlightedLink && highlightedLink.target);
    var someNodeHighlighted = !!(
        highlightedNode ||
        (highlightedLink && highlightedLink.source && highlightedLink.target)
    );
    var opacity = void 0;

    if (someNodeHighlighted && config.highlightDegree === 0) {
        opacity = highlight ? config.node.opacity : config.highlightOpacity;
    } else if (someNodeHighlighted) {
        opacity = highlight ? config.node.opacity : config.highlightOpacity;
    } else {
        opacity = config.node.opacity;
    }

    return opacity;
}

/**
 * Receives a matrix of the graph with the links source and target as concrete node instances and it transforms it
 * in a lightweight matrix containing only links with source and target being strings representative of some node id
 * and the respective link value (if non existent will default to 1).
 * @param  {Array.<Link>} graphLinks - an array of all graph links.
 * @param  {Object} config - the graph config.
 * @returns {Object.<string, Object>} an object containing a matrix of connections of the graph, for each nodeId,
 * there is an object that maps adjacent nodes ids (string) and their values (number).
 * @memberof Graph/helper
 */
function _initializeLinks(graphLinks, config) {
    return graphLinks.reduce(function(links, l) {
        var source = l.source.id || l.source;
        var target = l.target.id || l.target;

        if (!links[source]) {
            links[source] = {};
        }

        if (!links[target]) {
            links[target] = {};
        }

        var value = l.value || 1;

        links[source][target] = value;

        if (!config.directed) {
            links[target][source] = value;
        }

        return links;
    }, {});
}

/**
 * Method that initialize graph nodes provided by rd3g consumer and adds additional default mandatory properties
 * that are optional for the user. Also it generates an index mapping, this maps nodes ids the their index in the array
 * of nodes. This is needed because d3 callbacks such as node click and link click return the index of the node.
 * @param  {Array.<Node>} graphNodes - the array of nodes provided by the rd3g consumer.
 * @returns {Object.<string, Object>} returns the nodes ready to be used within rd3g with additional properties such as x, y
 * and highlighted values.
 * @memberof Graph/helper
 */
function _initializeNodes(graphNodes) {
    var nodes = {};
    var n = graphNodes.length;

    for (var i = 0; i < n; i++) {
        var node = graphNodes[i];

        node.highlighted = false;

        if (!node.hasOwnProperty('x')) {
            node.x = 0;
        }
        if (!node.hasOwnProperty('y')) {
            node.y = 0;
        }

        nodes[node.id.toString()] = node;
    }

    return nodes;
}

/**
 * Maps an input link (with format `{ source: 'sourceId', target: 'targetId' }`) to a d3Link
 * (with format `{ source: { id: 'sourceId' }, target: { id: 'targetId' } }`). If d3Link with
 * given index exists already that same d3Link is returned.
 * @param {Object} link - input link.
 * @param {number} index - index of the input link.
 * @param {Array.<Object>} d3Links - all d3Links.
 * @param  {Object} config - same as {@link #buildGraph|config in buildGraph}.
 * @param {Object} state - Graph component current state (same format as returned object on this function).
 * @returns {Object} a d3Link.
 * @memberof Graph/helper
 */
function _mapDataLinkToD3Link(link, index) {
    var d3Links = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
    var config = arguments[3];
    var state = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

    var d3Link = d3Links[index];

    if (d3Link) {
        var toggledDirected = state.config && state.config.directed && config.directed !== state.config.directed;

        // every time we toggle directed config all links should be visible again
        if (toggledDirected) {
            return _extends({}, d3Link, { isHidden: false });
        }

        // every time we disable collapsible (collapsible is false) all links should be visible again
        return config.collapsible ? d3Link : _extends({}, d3Link, { isHidden: false });
    }

    var highlighted = false;
    var source = {
        id: link.source,
        highlighted: highlighted
    };
    var target = {
        id: link.target,
        highlighted: highlighted
    };

    return {
        index: index,
        source: source,
        target: target
    };
}

/**
 * Some integrity validations on links and nodes structure. If some validation fails the function will
 * throw an error.
 * @param  {Object} data - Same as {@link #initializeGraphState|data in initializeGraphState}.
 * @throws can throw the following error msg:
 * INSUFFICIENT_DATA - msg if no nodes are provided
 * INVALID_LINKS - if links point to nonexistent nodes
 * @returns {undefined}
 * @memberof Graph/helper
 */
function _validateGraphData(data) {
    if (!data.nodes || !data.nodes.length) {
        _utils2.default.throwErr('Graph', _err2.default.INSUFFICIENT_DATA);
    }

    var n = data.links.length;

    var _loop = function _loop(i) {
        var l = data.links[i];

        if (
            !data.nodes.find(function(n) {
                return n.id === l.source;
            })
        ) {
            _utils2.default.throwErr(
                'Graph',
                _err2.default.INVALID_LINKS + ' - "' + l.source + '" is not a valid source node id'
            );
        }
        if (
            !data.nodes.find(function(n) {
                return n.id === l.target;
            })
        ) {
            _utils2.default.throwErr(
                'Graph',
                _err2.default.INVALID_LINKS + ' - "' + l.target + '" is not a valid target node id'
            );
        }
    };

    for (var i = 0; i < n; i++) {
        _loop(i);
    }
}

/**
 * Build some Link properties based on given parameters.
 * @param  {Object} link - the link object for which we will generate properties.
 * @param  {Object.<string, Object>} nodes - same as {@link #buildGraph|nodes in buildGraph}.
 * @param  {Object.<string, Object>} links - same as {@link #buildGraph|links in buildGraph}.
 * @param  {Object} config - same as {@link #buildGraph|config in buildGraph}.
 * @param  {Function[]} linkCallbacks - same as {@link #buildGraph|linkCallbacks in buildGraph}.
 * @param  {string} highlightedNode - same as {@link #buildGraph|highlightedNode in buildGraph}.
 * @param  {Object} highlightedLink - same as {@link #buildGraph|highlightedLink in buildGraph}.
 * @param  {number} transform - value that indicates the amount of zoom transformation.
 * @returns {Object} returns an object that aggregates all props for creating respective Link component instance.
 * @memberof Graph/helper
 */
function buildLinkProps(link, nodes, links, config, linkCallbacks, highlightedNode, highlightedLink, transform) {
    var source = link.source,
        target = link.target;

    var x1 = (nodes[source] && nodes[source].x) || 0;
    var y1 = (nodes[source] && nodes[source].y) || 0;
    var x2 = (nodes[target] && nodes[target].x) || 0;
    var y2 = (nodes[target] && nodes[target].y) || 0;

    var d = (0, _link.buildLinkPathDefinition)(
        { source: { x: x1, y: y1 }, target: { x: x2, y: y2 } },
        config.link.type
    );

    var mainNodeParticipates = false;

    switch (config.highlightDegree) {
        case 0:
            break;
        case 2:
            mainNodeParticipates = true;
            break;
        default:
            // 1st degree is the fallback behavior
            mainNodeParticipates = source === highlightedNode || target === highlightedNode;
            break;
    }

    var reasonNode = mainNodeParticipates && nodes[source].highlighted && nodes[target].highlighted;
    var reasonLink =
        source === (highlightedLink && highlightedLink.source) &&
        target === (highlightedLink && highlightedLink.target);
    var highlight = reasonNode || reasonLink;

    var opacity = config.link.opacity;

    if (highlightedNode || (highlightedLink && highlightedLink.source)) {
        opacity = highlight ? config.link.opacity : config.highlightOpacity;
    }

    var stroke = link.color || config.link.color;

    if (highlight) {
        stroke =
            config.link.highlightColor === _graph3.default.KEYWORDS.SAME
                ? config.link.color
                : config.link.highlightColor;
    }

    var strokeWidth = config.link.strokeWidth * (1 / transform);

    if (config.link.semanticStrokeWidth) {
        var linkValue = links[source][target] || links[target][source] || 1;

        strokeWidth += linkValue * strokeWidth / 10;
    }

    var markerId = config.directed ? (0, _marker.getMarkerId)(highlight, transform, config) : null;

    return {
        markerId: markerId,
        d: d,
        source: source,
        target: target,
        strokeWidth: strokeWidth,
        stroke: stroke,
        mouseCursor: config.link.mouseCursor,
        className: _graph3.default.LINK_CLASS_NAME,
        opacity: opacity,
        onClickLink: linkCallbacks.onClickLink,
        onRightClickLink: linkCallbacks.onRightClickLink,
        onMouseOverLink: linkCallbacks.onMouseOverLink,
        onMouseOutLink: linkCallbacks.onMouseOutLink
    };
}

/**
 * Build some Node properties based on given parameters.
 * @param  {Object} node - the node object for whom we will generate properties.
 * @param  {Object} config - same as {@link #buildGraph|config in buildGraph}.
 * @param  {Function[]} nodeCallbacks - same as {@link #buildGraph|nodeCallbacks in buildGraph}.
 * @param  {string} highlightedNode - same as {@link #buildGraph|highlightedNode in buildGraph}.
 * @param  {Object} highlightedLink - same as {@link #buildGraph|highlightedLink in buildGraph}.
 * @param  {number} transform - value that indicates the amount of zoom transformation.
 * @returns {Object} returns object that contain Link props ready to be feeded to the Link component.
 * @memberof Graph/helper
 */
function buildNodeProps(node, config) {
    var nodeCallbacks = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var highlightedNode = arguments[3];
    var highlightedLink = arguments[4];
    var transform = arguments[5];

    var highlight =
        node.highlighted ||
        node.id === (highlightedLink && highlightedLink.source) ||
        node.id === (highlightedLink && highlightedLink.target);
    var opacity = _getNodeOpacity(node, highlightedNode, highlightedLink, config);
    var fill = node.color || config.node.color;

    if (highlight && config.node.highlightColor !== _graph3.default.KEYWORDS.SAME) {
        fill = config.node.highlightColor;
    }

    var stroke = node.strokeColor || config.node.strokeColor;

    if (highlight && config.node.highlightStrokeColor !== _graph3.default.KEYWORDS.SAME) {
        stroke = config.node.highlightStrokeColor;
    }

    var label = node[config.node.labelProperty] || node.id;

    if (typeof config.node.labelProperty === 'function') {
        label = config.node.labelProperty(node);
    }

    var t = 1 / transform;
    var nodeSize = node.size || config.node.size;
    var fontSize = highlight ? config.node.highlightFontSize : config.node.fontSize;
    var dx = fontSize * t + nodeSize / 100 + 1.5;
    var strokeWidth = highlight ? config.node.highlightStrokeWidth : config.node.strokeWidth;
    var svg = node.svg || config.node.svg;
    var fontColor = node.fontColor || config.node.fontColor;

    return _extends({}, node, {
        className: _graph3.default.NODE_CLASS_NAME,
        cursor: config.node.mouseCursor,
        cx: (node && node.x) || '0',
        cy: (node && node.y) || '0',
        fill: fill,
        fontColor: fontColor,
        fontSize: fontSize * t,
        dx: dx,
        fontWeight: highlight ? config.node.highlightFontWeight : config.node.fontWeight,
        id: node.id,
        label: label,
        onClickNode: nodeCallbacks.onClickNode,
        onRightClickNode: nodeCallbacks.onRightClickNode,
        onMouseOverNode: nodeCallbacks.onMouseOverNode,
        onMouseOut: nodeCallbacks.onMouseOut,
        opacity: opacity,
        renderLabel: config.node.renderLabel,
        size: nodeSize * t,
        stroke: stroke,
        strokeWidth: strokeWidth * t,
        svg: svg,
        type: node.symbolType || config.node.symbolType,
        viewGenerator: node.viewGenerator || config.node.viewGenerator,
        overrideGlobalViewGenerator: !node.viewGenerator && node.svg
    });
}

// list of properties that are of no interest when it comes to nodes and links comparison
var NODE_PROPERTIES_DISCARD_TO_COMPARE = ['x', 'y', 'vx', 'vy', 'index'];

/**
 * This function checks for graph elements (nodes and links) changes, in two different
 * levels of significance, updated elements (whether some property has changed in some
 * node or link) and new elements (whether some new elements or added/removed from the graph).
 * @param {Object} nextProps - nextProps that graph will receive.
 * @param {Object} currentState - the current state of the graph.
 * @returns {Object.<string, boolean>} returns object containing update check flags:
 * - newGraphElements - flag that indicates whether new graph elements were added.
 * - graphElementsUpdated - flag that indicates whether some graph elements have
 * updated (some property that is not in NODE_PROPERTIES_DISCARD_TO_COMPARE was added to
 * some node or link or was updated).
 * @memberof Graph/helper
 */
function checkForGraphElementsChanges(nextProps, currentState) {
    var nextNodes = nextProps.data.nodes.map(function(n) {
        return _utils2.default.antiPick(n, NODE_PROPERTIES_DISCARD_TO_COMPARE);
    });
    var nextLinks = nextProps.data.links;
    var stateD3Nodes = currentState.d3Nodes.map(function(n) {
        return _utils2.default.antiPick(n, NODE_PROPERTIES_DISCARD_TO_COMPARE);
    });
    var stateD3Links = currentState.d3Links.map(function(l) {
        return {
            // FIXME: solve this source data inconsistency later
            source: l.source.id || l.source,
            target: l.target.id || l.target
        };
    });
    var graphElementsUpdated = !(
        _utils2.default.isDeepEqual(nextNodes, stateD3Nodes) && _utils2.default.isDeepEqual(nextLinks, stateD3Links)
    );
    var newGraphElements =
        nextNodes.length !== stateD3Nodes.length ||
        nextLinks.length !== stateD3Links.length ||
        !_utils2.default.isDeepEqual(
            nextNodes.map(function(_ref) {
                var id = _ref.id;
                return { id: id };
            }),
            stateD3Nodes.map(function(_ref2) {
                var id = _ref2.id;
                return { id: id };
            })
        ) ||
        !_utils2.default.isDeepEqual(
            nextLinks,
            stateD3Links.map(function(_ref3) {
                var source = _ref3.source,
                    target = _ref3.target;
                return { source: source, target: target };
            })
        );

    return { graphElementsUpdated: graphElementsUpdated, newGraphElements: newGraphElements };
}

/**
 * Logic to check for changes in graph config.
 * @param {Object} nextProps - nextProps that graph will receive.
 * @param {Object} currentState - the current state of the graph.
 * @returns {Object.<string, boolean>} returns object containing update check flags:
 * - configUpdated - global flag that indicates if any property was updated.
 * - d3ConfigUpdated - specific flag that indicates changes in d3 configurations.
 * @memberof Graph/helper
 */
function checkForGraphConfigChanges(nextProps, currentState) {
    var newConfig = nextProps.config || {};
    var configUpdated =
        newConfig &&
        !_utils2.default.isEmptyObject(newConfig) &&
        !_utils2.default.isDeepEqual(newConfig, currentState.config);
    var d3ConfigUpdated =
        newConfig && newConfig.d3 && !_utils2.default.isDeepEqual(newConfig.d3, currentState.config.d3);

    return { configUpdated: configUpdated, d3ConfigUpdated: d3ConfigUpdated };
}

/**
 * Encapsulates common procedures to initialize graph.
 * @param {Object} props - Graph component props, object that holds data, id and config.
 * @param {Object} props.data - Data object holds links (array of **Link**) and nodes (array of **Node**).
 * @param {string} props.id - the graph id.
 * @param {Object} props.config - same as {@link #buildGraph|config in buildGraph}.
 * @param {Object} state - Graph component current state (same format as returned object on this function).
 * @returns {Object} a fully (re)initialized graph state object.
 * @memberof Graph/helper
 */
function initializeGraphState(_ref4, state) {
    var data = _ref4.data,
        id = _ref4.id,
        config = _ref4.config;

    _validateGraphData(data);

    var graph = void 0;

    if (state && state.nodes) {
        graph = {
            nodes: data.nodes.map(function(n) {
                return state.nodes[n.id]
                    ? Object.assign({}, n, _utils2.default.pick(state.nodes[n.id], NODE_PROPS_WHITELIST))
                    : Object.assign({}, n);
            }),
            links: data.links.map(function(l, index) {
                return _mapDataLinkToD3Link(l, index, state && state.d3Links, config, state);
            })
        };
    } else {
        graph = {
            nodes: data.nodes.map(function(n) {
                return Object.assign({}, n);
            }),
            links: data.links.map(function(l) {
                return Object.assign({}, l);
            })
        };
    }

    var newConfig = Object.assign({}, _utils2.default.merge(_graph5.default, config || {}));
    var nodes = _initializeNodes(graph.nodes);
    var links = _initializeLinks(graph.links, newConfig); // matrix of graph connections
    var _graph = graph,
        d3Nodes = _graph.nodes,
        d3Links = _graph.links;

    var formatedId = id.replace(/ /g, '_');
    var simulation = _createForceSimulation(newConfig.width, newConfig.height, newConfig.d3 && newConfig.d3.gravity);

    return {
        id: formatedId,
        config: newConfig,
        links: links,
        d3Links: d3Links,
        nodes: nodes,
        d3Nodes: d3Nodes,
        highlightedNode: '',
        simulation: simulation,
        newGraphElements: false,
        configUpdated: false,
        transform: 1
    };
}

/**
 * This function updates the highlighted value for a given node and also updates highlight props.
 * @param {Object.<string, Object>} nodes - an object containing all nodes mapped by their id.
 * @param {Object.<string, Object>} links - an object containing a matrix of connections of the graph.
 * @param {Object} config - an object containing rd3g consumer defined configurations {@link #config config} for the graph.
 * @param {string} id - identifier of node to update.
 * @param {string} value - new highlight value for given node.
 * @returns {Object} returns an object containing the updated nodes
 * and the id of the highlighted node.
 * @memberof Graph/helper
 */
function updateNodeHighlightedValue(nodes, links, config, id) {
    var value = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

    var highlightedNode = value ? id : '';
    var node = Object.assign({}, nodes[id], { highlighted: value });
    var updatedNodes = Object.assign({}, nodes, _defineProperty({}, id, node));

    // when highlightDegree is 0 we want only to highlight selected node
    if (links[id] && config.highlightDegree !== 0) {
        updatedNodes = Object.keys(links[id]).reduce(function(acc, linkId) {
            var updatedNode = Object.assign({}, updatedNodes[linkId], { highlighted: value });

            return Object.assign(acc, _defineProperty({}, linkId, updatedNode));
        }, updatedNodes);
    }

    return {
        nodes: updatedNodes,
        highlightedNode: highlightedNode
    };
}

exports.buildLinkProps = buildLinkProps;
exports.buildNodeProps = buildNodeProps;
exports.checkForGraphConfigChanges = checkForGraphConfigChanges;
exports.checkForGraphElementsChanges = checkForGraphElementsChanges;
exports.initializeGraphState = initializeGraphState;
exports.updateNodeHighlightedValue = updateNodeHighlightedValue;
