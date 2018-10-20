import {isUndefined} from './helpers';
import ElementWriter from './elementWriter';


/**
 * An extended ElementWriter which can handle:
 * - page-breaks (it adds new pages when there's not enough space left),
 * - repeatable fragments (like table-headers, which are repeated everytime
 *                         a page-break occurs)
 * - transactions (used for unbreakable-blocks when we want to make sure
 *                 whole block will be rendered on the same page)
 */
class PageElementWriter {

	addQr(qr, index) {
		return fitOnPage(this, (self) => self.writer.addQr(qr, index));
	}

	alignCanvas(node) {
		this.writer.alignCanvas(node);
	}

}


export default PageElementWriter;
