'use strict'

const _ = require('lodash')
const chrono = require('chrono-node')
const humanname = require('humanname')
// const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance()


let parseData = function (data, regex) {
	let result = data
	if (regex) {
		try {
			let rgx = regex
			if (_.isString(regex)) {
				rgx = new RegExp(regex, 'gim')
			}
			result = data.match(rgx)[0]
		} catch (error) {
			// console.log("Regex error: ", error)
		}
	}
	return result
}

let filterData = function (data, filter) {
	
	let result = data
	if (["raw"].includes(filter)) {
		// let the raw data
	} else if (["trim"].includes(filter)) {
		result = result.trim()
	} else if (["lowercase", "lcase"].includes(filter)) {
		result = result.toLowerCase()
	} else if (["uppercase", "ucase"].includes(filter)) {
		result = result.toUpperCase()
	} else if (["capitalize", "cap"].includes(filter)) {
		result = _.startCase(result)
	} else if (["number", "nb"].includes(filter)) {
		result = result.replace(/\D/g, "")
	} else {
		// Default trim and set one spaces
		result = result.replace(/\s+/gm, " ").trim()
	}
	return result
}

let extractByExtractor = function (data, extractor, plural = false) {
	let result = data
	let emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gmi
	let phoneRegex = /\+?\(?\d*\)? ?\(?\d+\)?\d*([\s./-]\d{2,})+/gmi

	if (["phone", "telephone"].includes(extractor)) {
		if (plural) {
			result = data.match(phoneRegex) || data
		} else {
			result = data.match(phoneRegex) !== null ? data.match(phoneRegex)[0] : ""
		}
		// let countryCode = result.match(/([A-Z])+/)[0]
		// console.log("countryCode", countryCode)
		// if (countryCode) {
		// 	try {
		// 		result = phoneUtil.parse(result, "US") // with option, the country code number
		// 	} catch (e) {
		// 		//
		// 	}
		// }
	} else if (["email", "mail", "@"].includes(extractor)) {
		if (plural) {
			result = data.match(emailRegex) || data
		} else {
			result = data.match(emailRegex) !== null ? data.match(emailRegex)[0] : ""
		}
	} else if (["date", "d"].includes(extractor)) {
		result = chrono.casual.parseDate(data).toString()
	} else if (["fullName", "firstName", "lastName", "initials", "suffix", "salutation"].includes(extractor)) {
		result = humanname.parse(data)
		if ("fullName".includes(extractor)) {
			// return the object
		} else if ("firstName".includes(extractor)) {
			result = result.firstName
		} else if ("lastName".includes(extractor)) {
			result = result.lastName
		} else if ("initials".includes(extractor)) {
			result = result.initials
		} else if ("suffix".includes(extractor)) {
			result = result.suffix
		} else if ("salutation".includes(extractor)) {
			result = result.salutation
		}
	}

	return result
}

let isAGroupKey = function (groupKey) {
	let groupProperties = ['_g', '_group', '_groupe']
	let isAGroup = false
	groupProperties.forEach(function (value) {
		if (value === groupKey || groupKey.startsWith(value + '_')) {
			isAGroup = true
			return
		}
	})
	return isAGroup
}

let getPropertyFromObj = function (obj, propertyName) {
	let properties = {
		'selector': ['_s', '_selector', '_selecteur', 'selector'],
		'attribute': ['_a', '_attr', '_attribut', 'attr', 'attribute'],
		'filter': ['_filter', '_f', '_filtre', 'filter'],
		'extractor': ['_e', '_extracteur', 'extractor', 'type', '_t'], //keep temporary old types
		'data': ['_d', '_data', '_donnee', 'data'],
		'parser': ['_p', '_parser', '_parseur', 'parser'],
		'break': ['_b', '_break', '_cassure']
	}

	let ob = this
	let res = null
	if (properties[propertyName]) {
		properties[propertyName].forEach(function (property, i) {
			if (obj[property]) {
				res = obj[property]
				return
			}
		})
	}
	return res
}

let timeSpent = function (lastTime) {
	return new Date().getTime() - lastTime
}

String.prototype.oneSplitFromEnd = function (char) {
	let arr = this.split(char),
		res = []

	res[1] = arr[arr.length - 1]
	arr.pop()
	res[0] = arr.join(char)
	return res
}

module.exports = function ($) {


	let getNodesFromSmartSelector = function (node, selector) {
		if (selector === "_parent_") {
			return node
		} else {
			return $(node).find(selector)
		}
	}

	let getFunctionalParameters = function (obj) {
		let result = {
			selector: getPropertyFromObj(obj, 'selector'),
			attribute: getPropertyFromObj(obj, 'attribute'),
			filter: getPropertyFromObj(obj, 'filter'),
			extractor: getPropertyFromObj(obj, 'extractor'),
			data: getPropertyFromObj(obj, 'data'),
			parser: getPropertyFromObj(obj, 'parser'),
			break: getPropertyFromObj(obj, 'break')
		}

		return result
	}

	let updateFunctionalParametersFromSelector = function (g, selector, node) {

		let gUpdate = extractSmartSelector({
			selector: selector,
			node: $(node)
		})

		g.selector = gUpdate.selector
		g.parser = g.parser ? g.parser : gUpdate.parser
		g.filter = g.filter ? g.filter : gUpdate.filter
		g.attribute = g.attribute ? g.attribute : gUpdate.attribute
		g.extractor = g.extractor ? g.extractor : gUpdate.extractor

		return g
	}

	let getDataFromNodes = function (nodes, g, {
		timestats = false,
		multiple = true
	} = {}) {
		let result = []

		if (timestats) {
			result = {}
			result['_value'] = []
		}


		// Getting data
		$(nodes).each(function (i, n) {
			let r = getTheRightData($(n), {
				extractor: g.extractor,
				filter: g.filter,
				attr: g.attribute,
				parser: g.parser
			})

			if (r) {
				if (result['_value']) {
					result['_value'].push(r)
				} else {
					result.push(r)
				}
			}
			// not multiple wanted, stop at the first one
			if (!multiple) {
				return
			}
		})

		if (result['_value']) {
			result['_timestat'] = timeSpent(gTime)
		}

		// avoid listing
		if (!multiple && result[0]) {
			result = result[0]
		}

		if (result.length === 0) {
			result = null
		}

		return result
	}

	let extractSmartSelector = function ({
		selector,
		node = null,
		attribute = null,
		filter = null,
		extractor = null,
		parser = null
	}) {
		let res = {
			"selector": selector,
			"attribute": attribute,
			"filter": filter,
			"extractor": extractor,
			"parser": parser
		}

		if (res.selector.includes('||')) {
			res.parser = res.selector.oneSplitFromEnd('||')[1].trim()
			res.selector = res.selector.oneSplitFromEnd('||')[0].trim()
		}

		if (res.selector.includes('|')) {
			res.filter = res.selector.oneSplitFromEnd('|')[1].trim()
			res.filter = res.filter.split(/\s+/)
			res.selector = res.selector.oneSplitFromEnd('|')[0].trim()
		}

		if (res.selector.includes('<')) {
			res.extractor = res.selector.oneSplitFromEnd('<')[1].trim()
			res.selector = res.selector.oneSplitFromEnd('<')[0].trim()
		}

		if (res.selector.includes('@')) {
			res.attribute = res.selector.oneSplitFromEnd('@')[1].trim()
			res.selector = res.selector.oneSplitFromEnd('@')[0].trim()
		}

		if (!res.extractor && !res.attribute && $(node).find(res.selector)['0'] && $(node).find(res.selector)['0'].name.toLowerCase() === "img") {
			res.attribute = "src"
		}

		return res
	}

	let getTheRightData = function (node, {
		attr = null,
		extractor = null,
		filter = null,
		parser = null,
		multiple = false
	} = {}) {

		//assuming we handle only one node from getDataFromNodes

		let result = null
		let localNode = node[0] || node // in case of many, shouldn't happen

		if (attr) {
			result = $(localNode).attr(attr)
		} else if (extractor === "html") {
			result = $(localNode).html()
		} else {
			result = $(localNode).text()
		}

		if (extractor && extractor !== "html") {
			result = extractByExtractor(result, extractor)
		}

		if (_.isObject(result)) {
			_.forOwn(result, function (value, key) {
				if (_.isArray(filter)) {
					filter.forEach(function (f, index) {
						result[key] = filterData(result[key], f)
					})
				}
			})
		} else {
			if (_.isArray(filter)) {
				filter.forEach(function (f, index) {
					result = filterData(result, f)
				})
			}
		}

		if (parser) {
			result = parseData(result, parser)
		}

		return result

	}


	// real prototype
	$.prototype.scrape = function (frame, {
		debug = false,
		timestats = false,
		string = false
	} = {}) {

		let output = {}
		let mainNode = $(this)

		let iterateThrough = function (obj, elem, node) {

			let gTime = new Date().getTime()

			_.forOwn(obj, function (currentValue, key) {

				// Security for jsonpath in "_to" > "_frame"
				if (key === "_frame" || key === "_from") {
					elem[key] = currentValue

					// If it's a group key
				} else if (isAGroupKey(key)) {

					let selector = getPropertyFromObj(currentValue, 'selector')
					let data = getPropertyFromObj(currentValue, 'data')
					let n = getNodesFromSmartSelector($(node), selector)
					iterateThrough(data, elem, $(n))

				} else {

					try {

						let g = {}

						if (_.isObject(currentValue) && !_.isArray(currentValue)) {
							g = getFunctionalParameters(currentValue)


							if (g.selector && _.isString(g.selector)) {
								g = updateFunctionalParametersFromSelector(g, g.selector, $(node))

								if (g.data && _.isObject(g.data)) {

									if (_.isArray(g.data)) {

										// Check if break included
										if (g.break && _.isString(g.break)) {

											let n = getNodesFromSmartSelector($(node), g.selector)
											let nodes = $(n).children(g.break)

											var breaklist = "#breaklist1234"
											$(n).after('<div id="breaklist1234"></div>')

											// Creating a proper list
											$(nodes).each(function (index, nn) {
												// console.log("nn", $(nn).text());
												$(breaklist).append('<div class="break b' + index + '"></div>')
												$('.break.b' + index).append(nn)

												$($(n).find(g.break)[index]).nextUntil(g.break).each(function (i, e) {
													$(breaklist).find('.break.b' + index).append(e)
												})
											})

											elem[key] = []

											// Iterating in this list
											$(breaklist).children(".break").each(function (index, nn) {
												elem[key][index] = {}
												iterateThrough(g.data[0], elem[key][index], $(nn))
											})

										}
										// Check if object in array
										else if (_.isObject(g.data[0]) && _.size(g.data[0]) > 0) {

											elem[key] = []

											$(node).find(g.selector).each(function (i, n) {
												elem[key][i] = {}
												iterateThrough(g.data[0], elem[key][i], $(n))
											})

											// If no object, taking the single string
										} else if (_.isString(g.data[0])) {

											let n = getNodesFromSmartSelector($(node), g.selector)
											let dataResp = getDataFromNodes($(n), g)
											if (dataResp) {
												elem[key] = dataResp
											}

										}

										// Simple data object to use parent selector as base
									} else {

										if (_.size(g.data) > 0) {
											elem[key] = {}
											let n = $(node).find(g.selector).first()
											iterateThrough(g.data, elem[key], $(n))
										}

									}

								} else {

									let n = getNodesFromSmartSelector($(node), g.selector)
									let dataResp = getDataFromNodes($(n), g, {
										multiple: false
									})
									if (dataResp) {
										// push data as unit of array
										elem[key] = dataResp
									}

								}
							}

							// There is no Selector but still an Object for organization
							else {
								elem[key] = {}
								iterateThrough(currentValue, elem[key], node)
							}
						} else if (_.isArray(currentValue)) {

							elem[key] = []
							// For each unique string
							currentValue.forEach(function (arrSelector, h) {
								if (_.isString(arrSelector)) {

									g = updateFunctionalParametersFromSelector(g, arrSelector, $(node))
									let n = getNodesFromSmartSelector($(node), g.selector)
									let dataResp = getDataFromNodes($(n), g)
									if (dataResp) {
										// push data as unit of array
										elem[key].push(...dataResp)
									}

								}
							})

						}
						// The Parameter is a single string === selector > directly scraped
						else {

							g = updateFunctionalParametersFromSelector(g, currentValue, $(node))
							let n = getNodesFromSmartSelector($(node), g.selector)
							let dataResp = getDataFromNodes($(n), g, {
								multiple: false
							})
							if (dataResp) {
								// push data as unit of array
								elem[key] = dataResp
							}

						}

					} catch (error) {
						console.log(error)
					}

				}

			})
		}

		iterateThrough(frame, output, mainNode)

		if (string) {
			output = JSON.stringify(output, null, 2)
		}

		return output
	}


}