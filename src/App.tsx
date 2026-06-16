import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { listChampionships, getChampionshipDetail, updateChampionshipPodium, loadPhaseGroups, getEditionTopScorers, getClubTeams, getTeamMatches, getTeamMatchYears, getTeamDetail, getTeamAthleteStats, getClub, getClubMatches, getClubTitles, listClubs, getUpcomingMatches, getRecentMatches, getMatchDetail, getHeadToHead, listVenues, getVenueMatches, getLiveWindowMatches, searchAthletes, addAthleteToTeam, getTeamAthletes, addMatchEvent, annulMatchEvent, listReferees, getRefereeDetail, getRefereeMatches, clubRepository, venueRepository, listPartners, listNews, getNewsDetail, listDocuments, listEmendas } from "./infrastructure/composition";
import { TopNav } from "@presentation/components/TopNav";
import { Footer } from "@presentation/components/Footer";
import { HomePage } from "@presentation/pages/HomePage";
import { ChampionshipsPage } from "@presentation/pages/ChampionshipsPage";
import { ChampionshipDetailPage } from "@presentation/pages/ChampionshipDetailPage";
import { TeamDetailPage } from "@presentation/pages/TeamDetailPage";
import { ClubDetailPage } from "@presentation/pages/ClubDetailPage";
import { ClubsPage } from "@presentation/pages/ClubsPage";
import { MatchDetailPage } from "@presentation/pages/MatchDetailPage";
import { LiveMatchesPage } from "@presentation/pages/LiveMatchesPage";
import { VenuesPage } from "@presentation/pages/VenuesPage";
import { VenueDetailPage } from "@presentation/pages/VenueDetailPage";
import { RefereesPage } from "@presentation/pages/RefereesPage";
import { RefereeDetailPage } from "@presentation/pages/RefereeDetailPage";
import { RoundSharePage } from "@presentation/pages/RoundSharePage";
import { NewsPage } from "@presentation/pages/NewsPage";
import { NewsDetailPage } from "@presentation/pages/NewsDetailPage";
import { DocumentsPage } from "@presentation/pages/DocumentsPage";
import { EmendasPage } from "@presentation/pages/EmendasPage";
import { ActiveLeagueProvider, useActiveLeague } from "@presentation/context/ActiveLeagueContext";
import { useEffect } from "react";
import bgSports from "./images/bg_sports.png";

const _RAW_BASE_NAV = "https://raw.githubusercontent.com/gsennaura/sports-manager-assets/refs/heads/main";
const NO_LEAGUE_PHOTO_NAV = `${_RAW_BASE_NAV}/leagues/no_league_photo.png`;

function LeagueTopBanner() {
  const { league } = useActiveLeague();
  if (!league) return null;
  return (
    <>
      <div className="league-top-banner" />
      <a href="/" className="league-top-banner__link">
        <img
          src={league.logo_url ?? NO_LEAGUE_PHOTO_NAV}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = NO_LEAGUE_PHOTO_NAV; }}
          alt={league.short_name}
          className="league-top-banner__logo"
          style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.15))" }}
        />
        <div className="league-top-banner__info">
          <div className="league-top-banner__name">{league.short_name}</div>
          <div className="league-top-banner__full-name">{league.name}</div>
          {league.city_name && (
            <div className="league-top-banner__city">{league.city_name}{league.founded_year ? ` · Est. ${league.founded_year}` : ""}</div>
          )}
        </div>
      </a>
    </>
  );
}

const appBg: React.CSSProperties = {
  minHeight: "100vh",
  backgroundImage: `url(${bgSports})`,
  backgroundSize: "cover",
  backgroundPosition: "center top",
  backgroundAttachment: "fixed",
};

function PublicLayout() {
  return <div className="page-card"><Outlet /></div>;
}

function TitleUpdater() {
  const { league } = useActiveLeague();
  useEffect(() => {
    if (league?.name) document.title = league.name;
  }, [league]);
  return null;
}

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ActiveLeagueProvider>
        <TitleUpdater />
        <div style={appBg}>
        <div style={{ position: "sticky", top: 0, zIndex: 100 }}>
          <LeagueTopBanner />
          <TopNav />
        </div>
        <div style={{ paddingBottom: "72px" }}>
        <Routes>
          <Route path="/share/rodada" element={<RoundSharePage />} />
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage getUpcomingMatches={getUpcomingMatches} getRecentMatches={getRecentMatches} listChampionships={listChampionships} listPartners={listPartners} listNews={listNews} />} />
            <Route path="/ligas" element={<Navigate to="/campeonatos" replace />} />
            <Route path="/ligas/:id" element={<Navigate to="/campeonatos" replace />} />
            <Route path="/noticias" element={<NewsPage listNews={listNews} leagueId={import.meta.env.VITE_LEAGUE_ID} />} />
            <Route path="/noticias/:id" element={<NewsDetailPage getNewsDetail={getNewsDetail} />} />
            <Route path="/documentos" element={<DocumentsPage listDocuments={listDocuments} leagueId={import.meta.env.VITE_LEAGUE_ID} />} />
            <Route path="/emendas" element={<EmendasPage listEmendas={listEmendas} leagueId={import.meta.env.VITE_LEAGUE_ID} />} />
            <Route path="/campeonatos" element={<ChampionshipsPage listChampionships={listChampionships} />} />
            <Route path="/campeonatos/:id" element={<ChampionshipDetailPage getChampionshipDetail={getChampionshipDetail} updateChampionshipPodium={updateChampionshipPodium} loadPhaseGroups={loadPhaseGroups} getEditionTopScorers={getEditionTopScorers} />} />
            <Route path="/locais" element={<VenuesPage listVenues={listVenues} leagueId={import.meta.env.VITE_LEAGUE_ID} />} />
            <Route path="/locais/:slug" element={<VenueDetailPage getVenueMatches={getVenueMatches} venueRepository={venueRepository} />} />
            <Route path="/clubes" element={<ClubsPage listClubs={listClubs} />} />
            <Route path="/clubes/:slug" element={<ClubDetailPage getClub={getClub} getClubMatches={getClubMatches} getClubTitles={getClubTitles} getClubTeams={getClubTeams} clubRepository={clubRepository} />} />
            <Route path="/times/:slug" element={<TeamDetailPage getTeamMatches={getTeamMatches} getTeamMatchYears={getTeamMatchYears} getTeamDetail={getTeamDetail} getTeamAthletes={getTeamAthletes} getTeamAthleteStats={getTeamAthleteStats} addAthleteToTeam={addAthleteToTeam} searchAthletes={searchAthletes} />} />
            <Route path="/partidas/:id" element={<MatchDetailPage getMatchDetail={getMatchDetail} getHeadToHead={getHeadToHead} getTeamAthletes={getTeamAthletes} getTeamMatches={getTeamMatches} addMatchEvent={addMatchEvent} annulMatchEvent={annulMatchEvent} />} />
            <Route path="/ao-vivo" element={<LiveMatchesPage getLiveWindowMatches={getLiveWindowMatches} />} />
            <Route path="/atletas" element={<Navigate to="/" replace />} />
            <Route path="/atletas/:id" element={<Navigate to="/" replace />} />
            <Route path="/arbitros" element={<RefereesPage listReferees={listReferees} leagueId={import.meta.env.VITE_LEAGUE_ID} />} />
            <Route path="/arbitros/:id" element={<RefereeDetailPage getRefereeDetail={getRefereeDetail} getRefereeMatches={getRefereeMatches} />} />
            <Route path="/admin/*" element={<Navigate to="/" replace />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/cadastro" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </div>
        <Footer />
        </div>
      </ActiveLeagueProvider>
    </BrowserRouter>
  );
}
