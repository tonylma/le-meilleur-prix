import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
export default function Layout({ apiUrl }) { return <><Header apiUrl={apiUrl} /><main><div className="container"><Outlet /></div></main><Footer /></>; }
