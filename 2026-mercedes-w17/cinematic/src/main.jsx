import React,{lazy,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import './style.css';
import './study.css';
const Compare=lazy(()=>import('./Compare.jsx'));
createRoot(document.getElementById('root')).render(location.search.includes('compare')?<Suspense fallback={<p>Loading comparison…</p>}><Compare/></Suspense>:<App/>);
