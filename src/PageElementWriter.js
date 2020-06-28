import ElementWriter from './ElementWriter';

/**
 * An extended ElementWriter which can handle:
 * - page-breaks (it adds new pages when there's not enough space left),
 * - repeatable fragments (like table-headers, which are repeated everytime
 *                         a page-break occurs)
 * - transactions (used for unbreakable-blocks when we want to make sure
 *                 whole block will be rendered on the same page)
 */
class PageElementWriter extends ElementWriter {
	constructor(context) {
		super(context);
		this.transactionLevel = 0;
		this.repeatables = [];
		
		//Code Change - Heading continuty.
		this.repeatableHeaders = [];
		this.headings = {};
		this.sameNodeHeadings = {};
	}

	addLine(line, headingLevel, dontUpdateContextPosition, index) {
		return this._fitOnPage(() => super.addLine(line, dontUpdateContextPosition, index), headingLevel);
	}

	addImage(image, index) {
		return this._fitOnPage(() => super.addImage(image, index));
	}

	addCanvas(image, index) {
		return this._fitOnPage(() => super.addCanvas(image, index));
	}

	addSVG(image, index) {
		return this._fitOnPage(() => super.addSVG(image, index));
	}

	addQr(qr, index) {
		return this._fitOnPage(() => super.addQr(qr, index));
	}

	addVector(vector, ignoreContextX, ignoreContextY, index) {
		return super.addVector(vector, ignoreContextX, ignoreContextY, index);
	}

	beginClip(width, height) {
		return super.beginClip(width, height);
	}

	endClip() {
		return super.endClip();
	}

	addFragment(fragment, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition) {
		return this._fitOnPage(() => super.addFragment(fragment, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition));
	}

	moveToNextPage(pageOrientation, headingLevelCheck) {
		let nextPage = this.context().moveToNextPage(pageOrientation);

		/*
		Code Change - Heading continuty.

		Removing headers with greater level than current level.
		*/
		if(headingLevelCheck >=0){
			if(headingLevelCheck === 0){
			  this.repeatableHeaders = [];        
			}
	  
			let levels = Object.keys(this.headings);
			levels.map((key) =>{
			  if(key >= headingLevelCheck){
				  this.headings[key] = ''
			  }           
			});
		};
		
		//Similar process as repeatables.
		let yOffset = 0;
		this.repeatableHeaders.forEach(function (rep) {
				  
			this.addFragment({
				...rep,
				items: rep.items.map(header => ({
					...header,
				
				})),
				yOffset: 0
			}, true, true);
			yOffset += rep.items.reduce((acc, header) => header.item.y, 0)
			
		}, this);

		// moveToNextPage is called multiple times for table, because is called for each column
		// and repeatables are inserted only in the first time. If columns are used, is needed
		// call for table in first column and then for table in the second column (is other repeatables).
		this.repeatables.forEach(function (rep) {
			if (rep.insertedOnPages[this.context().page] === undefined) {
				rep.insertedOnPages[this.context().page] = true;
				this.addFragment(rep, true);
			} else {
				this.context().moveDown(rep.height);
			}
		}, this);

		this.emit('pageChanged', {
			prevPage: nextPage.prevPage,
			prevY: nextPage.prevY,
			y: this.context().y
		});
	}

	beginUnbreakableBlock(width, height) {
		if (this.transactionLevel++ === 0) {
			this.originalX = this.context().x;
			this.pushContext(width, height);
		}
	}

	commitUnbreakableBlock(forcedX, forcedY) {
		if (--this.transactionLevel === 0) {
			let unbreakableContext = this.context();
			this.popContext();

			let nbPages = unbreakableContext.pages.length;
			if (nbPages > 0) {
				// no support for multi-page unbreakableBlocks
				let fragment = unbreakableContext.pages[0];
				fragment.xOffset = forcedX;
				fragment.yOffset = forcedY;

				//TODO: vectors can influence height in some situations
				if (nbPages > 1) {
					// on out-of-context blocs (headers, footers, background) height should be the whole DocumentContext height
					if (forcedX !== undefined || forcedY !== undefined) {
						fragment.height = unbreakableContext.getCurrentPage().pageSize.height - unbreakableContext.pageMargins.top - unbreakableContext.pageMargins.bottom;
					} else {
						fragment.height = this.context().getCurrentPage().pageSize.height - this.context().pageMargins.top - this.context().pageMargins.bottom;
						for (let i = 0, l = this.repeatables.length; i < l; i++) {
							fragment.height -= this.repeatables[i].height;
						}
					}
				} else {
					fragment.height = unbreakableContext.y;
				}

				if (forcedX !== undefined || forcedY !== undefined) {
					super.addFragment(fragment, true, true, true);
				} else {
					this.addFragment(fragment);
				}
			}
		}
	}

	currentBlockToRepeatable() {
		let unbreakableContext = this.context();
		let rep = { items: [] };

		unbreakableContext.pages[0].items.forEach(item => {
			rep.items.push(item);
		});

		rep.xOffset = this.originalX;

		//TODO: vectors can influence height in some situations
		rep.height = unbreakableContext.y;

		rep.insertedOnPages = [];

		return rep;
	}

	pushToRepeatables(rep) {
		this.repeatables.push(rep);
	}

	popFromRepeatables() {
		this.repeatables.pop();
	}

	//Code Change - Heading continuty:- Function to add incoming headers to headings object. heading levels [0-n] is added and -1 removes all existing headers.
	pushToheader(header,level,sameNodeCheck){
    
		if(header && header.item && header.item.inlines[0].text && header.item.x && header.item.y){

			if(sameNodeCheck && this.headings[level].item && header.item){
				let headingInLine = this.headings[level].item.inlines;
				let headingText = headingInLine[headingInLine.length-1].text;
				let headingContinutyText = this.headings[level].item.headingContinutyText;
				if(headingContinutyText){
					this.headings[level].item.inlines[headingInLine.length-1].text = headingText.replace(headingContinutyText,'').trim();
				}
				this.sameNodeHeadings[level] = header;
			}else{
				let keys = Object.keys(this.headings);
					
				if(this.headings[level-1] || level === 0){
					this.headings[level] = header
				}
					
				keys.forEach(key =>{
					if(key > level){
						this.headings[key] = ''
					}
				});
			
				if(level < 0){
					this.headings = {};
				}
			}			
			
			this.pushToRepeatableHeaders();
		} 
		
	
	}

	//Code Change - Heading continuty:- Function to push headings to repeatableHeader object and also positioning and building headers for same nodes.
	pushToRepeatableHeaders() {
		let currentHeaderHeight = this.context().pageMargins.top;
		this.repeatableHeaders = [];
	  
		let keys = Object.keys(this.headings);
		for(let i = 0;i<keys.length;i++){
		  if(Object.keys(this.headings[i]).length > 0){ 
        if(i>0){
          this.headings[i].item.y = currentHeaderHeight + 15;
          this.headings[i].item.x = this.context().x;
          currentHeaderHeight = this.headings[i].item.y;
        }
        if(this.sameNodeHeadings[i]){
          this.sameNodeHeadings[i].item.y = currentHeaderHeight + 15;
          this.sameNodeHeadings[i].item.x = this.context().x;
          currentHeaderHeight = this.sameNodeHeadings[i].item.y;
        }
        if(i === keys.length - 1){
          this.context.y = currentHeaderHeight + 5;
        }

        this.repeatableHeaders.push({
          height: 15,
          xOffset: 0,
          items: [this.headings[i]]
        });

        if(this.sameNodeHeadings[i]){
          this.repeatableHeaders.push({
            height: 15,
            xOffset: 0,
            items: [this.sameNodeHeadings[i]]
          });
        }
		  }
		}
	}

	_fitOnPage(addFct, headingLevel) {
		let position = addFct();
		if (!position) {
			if(headingLevel){
				this.moveToNextPage(undefined,headingLevel);
			}else{
				this.moveToNextPage();
			}      
			position = addFct();
		}
		return position;
	}

}

export default PageElementWriter;
