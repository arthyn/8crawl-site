import { h, render } from '../web_modules/preact.js';
import htm from "../web_modules/htm.js";
import archiver from './archiver.js';

const html = htm.bind(h);

const app = html`<${archiver} />`;
render(app, document.getElementById('app'));