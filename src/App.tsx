import { useEffect, useLayoutEffect, useState, useRef, lazy, Suspense } from 'react';
import { useHashRoute } from '@/hooks/useHashRoute';
import { setSEO, setJsonLd } from '@/lib/seo';
import { useT } from '@/i18n/useI18n';
import { NavBar } from '@/components/NavBar';
import { MobileTabBar } from '@/components/MobileTabBar';
import { PageLoader } from '@/components/PageLoader';
import { Footer } from '@/components/Footer';
import { ToastContainer } from '@/components/ToastContainer';
import { AuthModal } from '@/components/AuthModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { BackgroundFX } from '@/components/BackgroundFX';
import { ScrollProgress } from '@/components/ScrollProgress';
import { LandingPage } from '@/pages/LandingPage';
import { HomePage } from '@/pages/HomePage';

const CategoryPage = lazy(() => import('@/pages/CategoryPage').then(m => ({ default: m.CategoryPage })));
const ScenarioPage = lazy(() => import('@/pages/ScenarioPage').then(m => ({ default: m.ScenarioPage })));
const SearchPage = lazy(() => import('@/pages/SearchPage').then(m => ({ default: m.SearchPage })));
const ResourcePage = lazy(() => import('@/pages/ResourcePage').then(m => ({ default: m.ResourcePage })));
const SubmitPage = lazy(() => import('@/pages/SubmitPage').then(m => ({ default: m.SubmitPage })));
const AboutPage = lazy(() => import('@/pages/AboutPage').then(m => ({ default: m.AboutPage })));
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })));
const MyPage = lazy(() => import('@/pages/MyPage').then(m => ({ default: m.MyPage })));
const RankingPage = lazy(() => import('@/pages/RankingPage').then(m => ({ default: m.RankingPage })));
const HelpPage = lazy(() => import('@/pages/HelpPage').then(m => ({ default: m.HelpPage })));
const AdminPage = lazy(() => import('@/pages/AdminPage').then(m => ({ default: m.AdminPage })));
const SpeedTestPage = lazy(() => import('@/pages/SpeedTestPage').then(m => ({ default: m.SpeedTestPage })));
const ComparePage = lazy(() => import('@/pages/ComparePage').then(m => ({ default: m.ComparePage })));
const WeeklyPicksPage = lazy(() => import('@/pages/WeeklyPicksPage').then(m => ({ default: m.WeeklyPicksPage })));
const ApiKeysPage = lazy(() => import('@/pages/ApiKeysPage').then(m => ({ default: m.ApiKeysPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

function Router() {
  const route = useHashRoute();
  const fallback = <div className="route-fade" style={{ minHeight: '60dvh' }} />;
  return (
    <Suspense fallback={fallback}>
      {(() => {
        switch (route.name) {
          case 'landing': return <LandingPage />;
          case 'category': return <CategoryPage />;
          case 'scenario': return <ScenarioPage />;
          case 'resource': return <ResourcePage />;
          case 'search': return <SearchPage />;
          case 'submit': return <SubmitPage />;
          case 'about': return <AboutPage />;
          case 'favorites': return <FavoritesPage />;
          case 'my': return <MyPage />;
          case 'ranking': return <RankingPage />;
          case 'help': return <HelpPage />;
          case 'admin': return <AdminPage />;
          case 'speedtest': return <SpeedTestPage />;
          case 'compare': return <ComparePage />;
          case 'weekly-picks': return <WeeklyPicksPage />;
          case 'api-keys': return <ApiKeysPage />;
          case 'notfound': return <NotFoundPage />;
          default: return <HomePage />;
        }
      })()}
    </Suspense>
  );
}

export default function App() {
  const route = useHashRoute();
  const t = useT();
  const isLanding = route.name === 'landing';
  const [showOverlay, setShowOverlay] = useState(false);
  const prevKey = useRef('');

  // SEO：路由变化时同步 title / meta description / OG / canonical（利于收录与分享卡片）
  useEffect(() => {
    const nameMap: Record<string, { t: string; d?: string }> = {
      home: { t: t('nav.home') },
      search: { t: `${t('nav.search')}${route.q ? `: ${route.q}` : ''}` },
      submit: { t: t('nav.submit') },
      favorites: { t: t('nav.favorites') },
      my: { t: t('nav.my') },
      about: { t: t('nav.about') },
      help: { t: t('nav.help') },
      category: { t: t('nav.categories') },
      scenario: { t: t('nav.categories') },
      resource: { t: '资源详情' },
    };
    if (!isLanding) {
      const info = nameMap[route.name] ?? {};
      setSEO({
        title: info.t,
        description: info.d,
        path: route.slug ? `/${route.name}/${route.slug}` : route.id ? `/${route.name}/${route.id}` : `/${route.name}`,
      });
      // 清除上一路由的页面级 JSON-LD（ResourcePage 加载后会重新注入自己的）
      setJsonLd(null);
    }
  }, [route.name, route.slug, route.q, route.id, t, isLanding]);

  // 路由切换时：仅从引导页跳转到主站时触发品牌露出 overlay，页面间切换不再显示
  useEffect(() => {
    const key = `${route.name}-${route.slug ?? ''}-${route.id ?? ''}`;
    // prevKey 必须无条件先更新：否则从 landing 进入后 ref 永远停在 landing，
    // 之后每次导航都会被误判为「从引导页进入」，1.5s 遮罩反复出现
    const fromLanding = prevKey.current.startsWith('landing') && route.name !== 'landing';
    prevKey.current = key;
    if (!fromLanding) return;
    setShowOverlay(true);
    const timer = setTimeout(() => setShowOverlay(false), 1500);
    // 展示期间路由再变（如浏览器返回键）：cleanup 必须同时复位状态，
    // 否则 clearTimeout 后 showOverlay 永久为 true，全屏遮罩卡死
    return () => {
      clearTimeout(timer);
      setShowOverlay(false);
    };
  }, [route.name, route.slug, route.id]);

  // 路由切换时强制回到顶部（在绘制前同步执行，避免新页面停在旧滚动位置的一帧闪烁）
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const el = document.documentElement ?? document.body;
    if (el) el.scrollTop = 0;
  }, [route.name, route.slug, route.id, route.q]);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* 全局动态背景（光晕漂移 + 坐标纸网格）与顶部阅读进度条 */}
      <BackgroundFX />
      <ScrollProgress />

      {/* 路由切换过渡加载层：圆形光环 + Logo + 语录（品牌露出） */}
      {showOverlay && <PageLoader />}

      {/* 导航栏：非引导页显示；首次进入时由上滑入 */}
      {!isLanding && (
        <div className="animate-slide-up">
          <NavBar />
        </div>
      )}

      {/* 内容区：引导页全屏无边距，内页标准容器；底部为移动端 Tab 预留空间 */}
      <main className={`flex-1 ${isLanding ? '' : 'container py-6 pb-24 sm:pb-6'}`}>
        <div key={`${route.name}-${route.slug ?? ''}-${route.id ?? ''}`} className="animate-fade-in">
          <Router />
        </div>
      </main>

      {!isLanding && (
        // pb 底部预留：移动端固定 TabBar（56px + safe-area）会遮挡页脚最后一行
        <footer className="animate-fade-in pb-20 sm:pb-0" style={{ animationDelay: '0.15s' }}>
          <Footer />
        </footer>
      )}

      {/* 移动端底部导航（仅 sm 以下显示） */}
      {!isLanding && <MobileTabBar />}

      <ToastContainer />
      <AuthModal />
      <OnboardingModal />
    </div>
  );
}
