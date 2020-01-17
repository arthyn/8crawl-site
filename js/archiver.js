import { h, Component } from '../web_modules/preact.js';
import htm from '../web_modules/htm.js';

const html = htm.bind(h);

const collectionPattern = /8tracks.com\/users\/\w*\/collections/gi;
const historyPattern = /8tracks.com\/mix_sets\/listened\:\d*/gi;
const baseUrl = 'https://rytphgcpea.execute-api.us-east-1.amazonaws.com/dev/';
const archiveRequestUrl = new URL(`${baseUrl}archive/request`);
const archiveDownloadUrl = new URL(`${baseUrl}archive/download`);

export default class Archiver extends Component {
	constructor() {
		super();

		this.state = {
			errorMsg: '',
			archiveUrl: '',
			type: '',
			requestId: '',
			zipUrl: '',
			count: 0,
			total: 0
		}
	}

	inputHandler = (event) => {
		const archiveUrl = event.target.value;
		const type = this.getType(archiveUrl);

		const newState = {
			archiveUrl,
			type,
			errorMsg: archiveUrl && type === 'error' ? "Url doesn't match an 8tracks listening history or collection." : ''
		}
		this.setState(newState);
	}

	getType(url) {
		const isCollection = url.match(collectionPattern);
		const isHistory = url.match(historyPattern);
		return isCollection ? 'collection' : 
					 isHistory ? 'history' : 'error';
	}

	submitHandler = () => {
		const params = { 
			type: this.state.type, 
			url: this.state.archiveUrl
		};
		archiveRequestUrl.search = new URLSearchParams(params).toString();

		event.preventDefault();

		fetch(archiveRequestUrl)
			.then(response => {
				if (response.ok)
					return response.json();
				else {
					console.log(response.json());
					return null;
				}
			})
			.then(response => {
				if (response) {
					this.pollForDownload(response);
					this.setState({ requestId: response });
				} else {
					this.setState({ errorMsg: "Unable to request archive at this time. Try again later." });
				}
			})
	}

	pollForDownload(id, count) {
		let requestCount = count || 0;
		const params = { id };
		archiveDownloadUrl.search = new URLSearchParams(params).toString();

		if (requestCount > 60) {
			console.log('Cancelling polling');
			this.setState({ 
				errorMsg: "Archiving failed. Try again.",
				requestId: ''
			});
			return;
		}
		
		fetch(archiveDownloadUrl)
			.then(response => {
				if (response.ok)
					return response.json()
				else {
					console.log(response.json());
					return null;
				}
			})
			.then(response => {
				if (response == null) {
					this.setState({
						errorMsg: "Unable to check if archive is ready. Try again.",
						requestId: ''
					});
					return;
				}
				
				if (response.ready) {
					this.setState({
						requestId: '',
						zipUrl: response.url
					});
				} else {
					this.setState({
						count: response.count,
						total: response.total
					})
				}
			});

		setTimeout(() => {
			this.pollForDownload(id, ++requestCount);
		}, 1000);
	}

	getButtonText() {
		if (!this.state.requestId) {
			return 'Get Archive';
		}

		return this.state.count > 0 ? `Processing ${this.state.count} of ${this.state.total || '"a lot"'}...` : 'Archiving started...';
	}

	render() {
		return html`
		<div>
			<form method="POST" action=${archiveRequestUrl} onSubmit=${this.submitHandler}>
				${this.state.errorMsg && html`<div class="error">${this.state.errorMsg}</div>`}
				<label for="archiver-input">Listening history or collection url:</label>
				<input id="archiver-input" type="text" value=${this.state.archiveUrl} onInput=${this.inputHandler} />
				<button disabled=${!!this.state.errorMsg}>${this.getButtonText()}</button>
			</form>
			${this.state.zipUrl && html`
				<div class="download-container">
					<a href=${this.state.zipUrl} download>Download Archive</a>
				</div>`}
		</div>`;
	}	
}