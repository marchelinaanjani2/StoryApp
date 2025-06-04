import HomePage from '../pages/home/home-page';
import AboutPage from '../pages/about/about-page';
import AddStoryPage from '../pages/add/add-story-page';
import DetailStoryPage from '../pages/detail/detail-page';
import RegisterPage from '../pages/auth/register/register-page';
import LoginPage from '../pages/auth/login/login-page';
import BookmarkPage from '../pages/bookmark/bookmark-page';
import { checkAuthenticatedRoute, checkUnauthenticatedRouteOnly } from '../utils/auth';
import OfflineStories from '../pages/offlineStories.js';

export const routes = {
  '/login': () => checkUnauthenticatedRouteOnly(new LoginPage()),
  '/register': () => checkUnauthenticatedRouteOnly(new RegisterPage()),
  '/': () => checkAuthenticatedRoute(new HomePage()),
  '/about': () => checkAuthenticatedRoute(new AboutPage()),
  '/add': () => checkAuthenticatedRoute(new AddStoryPage()), 
  '/storys/:id': () => checkAuthenticatedRoute(new DetailStoryPage()),
  '/bookmark': () => checkAuthenticatedRoute(new BookmarkPage()),
  '/offline-stories': OfflineStories,

};



