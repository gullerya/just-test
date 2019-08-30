const
	ITEMS_KEY = Symbol('data.tier.items.key');

class DataTierItemTemplate extends HTMLTemplateElement {
	constructor() {
		super();
		this[ITEMS_KEY] = [];
	}

	get defaultTieTarget() {
		return 'items';
	}

	get items() {
		return this[ITEMS_KEY];
	}

	set items(newItemsList) {
		if (!Array.isArray(newItemsList)) {
			return;
		}

		this[ITEMS_KEY] = newItemsList;

		const
			container = this.parentNode,
			fceDataSet = this.content.firstElementChild.dataset,
			desiredListLength = newItemsList.length;

		let
			ruleData,
			templateItemAid;

		templateItemAid = fceDataSet.dtListItemAid;
		if (!templateItemAid) {
			templateItemAid = new Date().getTime();
			fceDataSet.dtListItemAid = templateItemAid;
		}

		//	adjust list elements size to the data length
		const existingList = container.querySelectorAll('[data-dt-list-item-aid="' + templateItemAid + '"]');
		let existingListLength = existingList.length;

		//	remove extra items, if any
		if (existingListLength > desiredListLength) {
			while (existingListLength > desiredListLength) container.removeChild(existingList[--existingListLength]);
		}

		//	add missing items, if any
		if (existingListLength < desiredListLength) {
			ruleData = DataTierItemTemplate.extractControllerParameters(this.dataset.tie);
			DataTierItemTemplate.insertNewContent(container, this, ruleData, existingListLength, desiredListLength);
		}
	}

	static extractControllerParameters(paramValue) {
		let procParam;
		if (paramValue) {
			procParam = paramValue.trim().split(/\s+=>\s+/);
			if (!procParam || !procParam.length) {
				throw new Error('invalid DataTier configuration');
			}
		}
		return procParam;
	}

	static insertNewContent(container, template, controllerParameters, from, to) {
		const
			prefix = controllerParameters[0] + (controllerParameters[0].indexOf(':') < 0 ? ':' : '.'),
			optimizationMap = DataTierItemTemplate.prepareOptimizationMap(template),
			optTmpIdx = optimizationMap.index,
			tmpContent = template.content;

		let result = null, tmpTemplate, index = from, i, tmp, views, view, rule;

		for (; index < to; index++) {
			tmpTemplate = tmpContent.cloneNode(true);
			views = tmpTemplate.querySelectorAll('*');
			i = optTmpIdx.length;
			while (i--) {
				tmp = optTmpIdx[i];
				view = views[tmp];
				rule = view.dataset.tie;

				rule = rule.replace(/item:/g, prefix + index + '.');
				rule = rule.replace(/item\s*=/g, prefix + index + '=');
				rule = rule.replace(/item(?![.a-zA-Z0-9])/g, prefix + index);

				view.dataset.tie = rule;
			}
			index === from ? result = tmpTemplate : result.appendChild(tmpTemplate);
		}

		container.appendChild(result);
	}

	//	extract and index all the data-tied elements from the template so that on each clone the pre-processing will be based on this index
	//	we just need to know which elements (index of array-like, outcome of 'querySelectorAll(*)') are relevant
	static prepareOptimizationMap(template) {
		const
			result = { index: [] },
			views = template.content.querySelectorAll('*');
		let i = views.length, view;
		while (i--) {
			view = views[i];
			if (view.dataset && typeof view.dataset.tie === 'string') {
				result.index.push(i);
			}
		}
		return result;
	}
}

if (!customElements.get('data-tier-item-template')) {
	customElements.define('data-tier-item-template', DataTierItemTemplate, { extends: 'template' });
}
