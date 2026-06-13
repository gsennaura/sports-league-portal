import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { listChampionships, getChampionshipDetail, updateChampionshipPodium, loadPhaseGroups, getEditionTopScorers, listTeams, getClubTeams, createTeam, updateTeam, deleteTeam, getTeamMatches, getTeamMatchYears, getTeamDetail, getTeamAthleteStats, listLeagues, getClub, getClubMatches, getClubTitles, listClubs, getUpcomingMatches, getRecentMatches, getMatchDetail, getHeadToHead, createVenue, listVenues, updateVenue, getVenueMatches, createClub, updateClub, createLeague, updateLeague, createChampionship, updateMatchResult, updateMatch, getLiveWindowMatches, searchAthletes, createAthlete, updateAthlete, deleteAthlete, bulkImportAthletes, addAthleteToTeam, removeAthleteFromTeam, getAthleteTeamHistory, getTeamAthletes, athleteRepository, addMatchEvent, annulMatchEvent, listReferees, getRefereeDetail, createReferee, updateReferee, deleteReferee, getRefereeMatches, refereeRepository, registerAthleteChampionship, updateChampionshipRegistration, listEditionRegistrations, getEligibleAthletes, checkAthleteMatchEvents, manageClubLeagueRegistrations, clubRepository, venueRepository, createCity, listCities, listStates, listPartners, listNews, getNewsDetail, listDocuments, listEmendas } from "./infrastructure/composition";
import { AuthProvider } from "@presentation/context/AuthContext";
import { ProtectedRoute } from "@presentation/components/ProtectedRoute";
import { TopNav } from "@presentation/components/TopNav";
import { Footer } from "@presentation/components/Footer";
import { LoginPage } from "@presentation/pages/LoginPage";
import { HomePage } from "@presentation/pages/HomePage";
import { ChampionshipsPage } from "@presentation/pages/ChampionshipsPage";
import { ChampionshipDetailPage } from "@presentation/pages/ChampionshipDetailPage";
import { TeamDetailPage } from "@presentation/pages/TeamDetailPage";
import { ClubDetailPage } from "@presentation/pages/ClubDetailPage";
import { ClubsPage } from "@presentation/pages/ClubsPage";
import { MatchDetailPage } from "@presentation/pages/MatchDetailPage";
import { AdminVenuesPage } from "@presentation/pages/AdminVenuesPage";
import { AdminVenueCreatePage } from "@presentation/pages/AdminVenueCreatePage";
import { AdminVenueEditPage } from "@presentation/pages/AdminVenueEditPage";
import { AdminVenueBulkImportPage } from "@presentation/pages/AdminVenueBulkImportPage";
import { AdminCitiesPage } from "@presentation/pages/AdminCitiesPage";
import { AdminClubBulkImportPage } from "@presentation/pages/AdminClubBulkImportPage";
import { AdminClubsPage } from "@presentation/pages/AdminClubsPage";
import { AdminClubCreatePage } from "@presentation/pages/AdminClubCreatePage";
import { AdminClubEditPage } from "@presentation/pages/AdminClubEditPage";
import { AdminLeaguesPage } from "@presentation/pages/AdminLeaguesPage";
import { AdminLeagueCreatePage } from "@presentation/pages/AdminLeagueCreatePage";
import { AdminLeagueEditPage } from "@presentation/pages/AdminLeagueEditPage";
import { AdminClubLeagueRegistrationPage } from "@presentation/pages/AdminClubLeagueRegistrationPage";
import { AdminChampionshipsPage } from "@presentation/pages/AdminChampionshipsPage";
import { AdminChampionshipCreatePage } from "@presentation/pages/AdminChampionshipCreatePage";
import { AdminChampionshipEditionsPage } from "@presentation/pages/AdminChampionshipEditionsPage";
import { AdminChampionshipManagePage } from "@presentation/pages/AdminChampionshipManagePage";
import { AdminGroupMatchesPage } from "@presentation/pages/AdminGroupMatchesPage";
import { AdminNewEditionPage } from "@presentation/pages/AdminNewEditionPage";
import { AdminTeamsPage } from "@presentation/pages/AdminTeamsPage";
import { AdminTeamCreatePage } from "@presentation/pages/AdminTeamCreatePage";
import { AdminTeamEditPage } from "@presentation/pages/AdminTeamEditPage";
import { AdminMatchResultPage } from "@presentation/pages/AdminMatchResultPage";
import { AdminMatchesPage } from "@presentation/pages/AdminMatchesPage";
import { AdminMatchEditPage } from "@presentation/pages/AdminMatchEditPage";
import { LiveMatchesPage } from "@presentation/pages/LiveMatchesPage";
import { VenuesPage } from "@presentation/pages/VenuesPage";
import { VenueDetailPage } from "@presentation/pages/VenueDetailPage";
import { AdminAthletesPage } from "@presentation/pages/AdminAthletesPage";
import { AdminAthleteCreatePage } from "@presentation/pages/AdminAthleteCreatePage";
import { AdminAthleteEditPage } from "@presentation/pages/AdminAthleteEditPage";
import { AdminAthleteTeamsPage } from "@presentation/pages/AdminAthleteTeamsPage";
import { AdminAthleteBulkImportPage } from "@presentation/pages/AdminAthleteBulkImportPage";
import { AdminImportHubPage } from "@presentation/pages/AdminImportHubPage";
import { AdminImportHistoryPage } from "@presentation/pages/AdminImportHistoryPage";
import { RefereesPage } from "@presentation/pages/RefereesPage";
import { RefereeDetailPage } from "@presentation/pages/RefereeDetailPage";
import { AdminRefereesPage } from "@presentation/pages/AdminRefereesPage";
import { AdminRefereeCreatePage } from "@presentation/pages/AdminRefereeCreatePage";
import { AdminRefereeEditPage } from "@presentation/pages/AdminRefereeEditPage";
import { AdminTeamBulkRegistrationPage } from "@presentation/pages/AdminTeamBulkRegistrationPage";
import { AdminRegistrationsPage } from "@presentation/pages/AdminRegistrationsPage";
import { MyProfilePage } from "@presentation/pages/MyProfilePage";
import { SolicitarVinculoPage } from "@presentation/pages/SolicitarVinculoPage";
import { AdminMembershipPendingPage } from "@presentation/pages/AdminMembershipPendingPage";
import { CadastroPage } from "@presentation/pages/CadastroPage";
import { DirigentePage } from "@presentation/pages/DirigentePage";
import { AdminDirigentesPage } from "@presentation/pages/AdminDirigentesPage";
import { AdminUsersPage } from "@presentation/pages/AdminUsersPage";
import { AdminLeagueAdminsPage } from "@presentation/pages/AdminLeagueAdminsPage";
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
      <AuthProvider>
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
            <Route path="/locais" element={<VenuesPage listVenues={listVenues} />} />
            <Route path="/locais/:slug" element={<VenueDetailPage getVenueMatches={getVenueMatches} venueRepository={venueRepository} />} />
            <Route path="/clubes" element={<ClubsPage listClubs={listClubs} />} />
            <Route path="/clubes/:slug" element={<ClubDetailPage getClub={getClub} getClubMatches={getClubMatches} getClubTitles={getClubTitles} getClubTeams={getClubTeams} clubRepository={clubRepository} />} />
            <Route path="/times/:slug" element={<TeamDetailPage getTeamMatches={getTeamMatches} getTeamMatchYears={getTeamMatchYears} getTeamDetail={getTeamDetail} getTeamAthletes={getTeamAthletes} getTeamAthleteStats={getTeamAthleteStats} addAthleteToTeam={addAthleteToTeam} searchAthletes={searchAthletes} />} />
            <Route path="/partidas/:id" element={<MatchDetailPage getMatchDetail={getMatchDetail} getHeadToHead={getHeadToHead} getTeamAthletes={getTeamAthletes} getTeamMatches={getTeamMatches} addMatchEvent={addMatchEvent} annulMatchEvent={annulMatchEvent} />} />
            <Route path="/ao-vivo" element={<LiveMatchesPage getLiveWindowMatches={getLiveWindowMatches} />} />
            <Route path="/atletas" element={<Navigate to="/" replace />} />
            <Route path="/atletas/:id" element={<Navigate to="/" replace />} />
            <Route path="/arbitros" element={<RefereesPage listReferees={listReferees} />} />
            <Route path="/arbitros/:id" element={<RefereeDetailPage getRefereeDetail={getRefereeDetail} getRefereeMatches={getRefereeMatches} />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<CadastroPage />} />
            <Route path="/meu-perfil" element={<ProtectedRoute role="any"><MyProfilePage /></ProtectedRoute>} />
            <Route path="/solicitar-vinculo" element={<ProtectedRoute role="any"><SolicitarVinculoPage /></ProtectedRoute>} />
            <Route path="/meu-time" element={<ProtectedRoute role="any"><DirigentePage /></ProtectedRoute>} />
          </Route>
          <Route path="/admin/locais" element={<ProtectedRoute><AdminVenuesPage listVenues={listVenues} /></ProtectedRoute>} />
          <Route path="/admin/locais/novo" element={<ProtectedRoute><AdminVenueCreatePage createVenue={createVenue} /></ProtectedRoute>} />
          <Route path="/admin/locais/importar" element={<ProtectedRoute><AdminVenueBulkImportPage createVenue={createVenue} /></ProtectedRoute>} />
          <Route path="/admin/locais/:id/editar" element={<ProtectedRoute><AdminVenueEditPage updateVenue={updateVenue} /></ProtectedRoute>} />
          <Route path="/admin/cidades" element={<ProtectedRoute><AdminCitiesPage createCity={createCity} listCities={listCities} listStates={listStates} /></ProtectedRoute>} />
          <Route path="/admin/clubes" element={<ProtectedRoute><AdminClubsPage listClubs={listClubs} /></ProtectedRoute>} />
          <Route path="/admin/clubes/importar" element={<ProtectedRoute><AdminClubBulkImportPage createClub={createClub} /></ProtectedRoute>} />
          <Route path="/admin/clubes/novo" element={<ProtectedRoute><AdminClubCreatePage createClub={createClub} /></ProtectedRoute>} />
          <Route path="/admin/clubes/:id/editar" element={<ProtectedRoute><AdminClubEditPage updateClub={updateClub} /></ProtectedRoute>} />
          <Route path="/admin/ligas" element={<ProtectedRoute><AdminLeaguesPage listLeagues={listLeagues} /></ProtectedRoute>} />
          <Route path="/admin/ligas/novo" element={<ProtectedRoute><AdminLeagueCreatePage createLeague={createLeague} /></ProtectedRoute>} />
          <Route path="/admin/ligas/:id/editar" element={<ProtectedRoute><AdminLeagueEditPage updateLeague={updateLeague} /></ProtectedRoute>} />
          <Route path="/admin/ligas/:id/clubes" element={<ProtectedRoute><AdminClubLeagueRegistrationPage manageClubLeagueRegistrations={manageClubLeagueRegistrations} /></ProtectedRoute>} />
          <Route path="/admin/campeonatos" element={<ProtectedRoute><AdminChampionshipsPage listChampionships={listChampionships} /></ProtectedRoute>} />
          <Route path="/admin/campeonatos/novo" element={<ProtectedRoute><AdminChampionshipCreatePage createChampionship={createChampionship} /></ProtectedRoute>} />
          <Route path="/admin/campeonatos/:id/edicoes" element={<ProtectedRoute><AdminChampionshipEditionsPage /></ProtectedRoute>} />
          <Route path="/admin/campeonatos/:id/nova-edicao" element={<ProtectedRoute><AdminNewEditionPage /></ProtectedRoute>} />
          <Route path="/admin/campeonatos/:id/gerenciar" element={<ProtectedRoute><AdminChampionshipManagePage /></ProtectedRoute>} />
          <Route path="/admin/campeonatos/:champId/grupos/:groupId/partidas" element={<ProtectedRoute><AdminGroupMatchesPage /></ProtectedRoute>} />
          <Route path="/admin/times" element={<ProtectedRoute><AdminTeamsPage listTeams={listTeams} deleteTeam={deleteTeam} /></ProtectedRoute>} />
          <Route path="/admin/times/novo" element={<ProtectedRoute><AdminTeamCreatePage createTeam={createTeam} /></ProtectedRoute>} />
          <Route path="/admin/times/:id/editar" element={<ProtectedRoute><AdminTeamEditPage updateTeam={updateTeam} getTeamAthletes={getTeamAthletes} addAthleteToTeam={addAthleteToTeam} removeAthleteFromTeam={removeAthleteFromTeam} searchAthletes={searchAthletes} /></ProtectedRoute>} />
          <Route path="/admin/times/:id/inscricoes" element={<ProtectedRoute><AdminTeamBulkRegistrationPage listChampionships={listChampionships} getTeamAthletes={getTeamAthletes} listEditionRegistrations={listEditionRegistrations} getEligibleAthletes={getEligibleAthletes} registerAthleteChampionship={registerAthleteChampionship} updateChampionshipRegistration={updateChampionshipRegistration} checkAthleteMatchEvents={checkAthleteMatchEvents} /></ProtectedRoute>} />
          <Route path="/admin/inscricoes" element={<ProtectedRoute><AdminRegistrationsPage listTeams={listTeams} listLeagues={listLeagues} listChampionships={listChampionships} getTeamAthletes={getTeamAthletes} listEditionRegistrations={listEditionRegistrations} getEligibleAthletes={getEligibleAthletes} registerAthleteChampionship={registerAthleteChampionship} updateChampionshipRegistration={updateChampionshipRegistration} checkAthleteMatchEvents={checkAthleteMatchEvents} /></ProtectedRoute>} />
          <Route path="/admin/atletas" element={<ProtectedRoute><AdminAthletesPage searchAthletes={searchAthletes} deleteAthlete={deleteAthlete} /></ProtectedRoute>} />
          <Route path="/admin/atletas/importar" element={<ProtectedRoute><AdminAthleteBulkImportPage bulkImportAthletes={bulkImportAthletes} addAthleteToTeam={addAthleteToTeam} /></ProtectedRoute>} />
          <Route path="/admin/importar" element={<ProtectedRoute><AdminImportHubPage /></ProtectedRoute>} />
          <Route path="/admin/importar/historico" element={<ProtectedRoute><AdminImportHistoryPage /></ProtectedRoute>} />
          <Route path="/admin/atletas/novo" element={<ProtectedRoute><AdminAthleteCreatePage createAthlete={createAthlete} /></ProtectedRoute>} />
          <Route path="/admin/atletas/:id/editar" element={<ProtectedRoute><AdminAthleteEditPage updateAthlete={updateAthlete} deleteAthlete={deleteAthlete} athleteRepository={athleteRepository} /></ProtectedRoute>} />
          <Route path="/admin/atletas/:id/times" element={<ProtectedRoute><AdminAthleteTeamsPage getAthleteTeamHistory={getAthleteTeamHistory} addAthleteToTeam={addAthleteToTeam} removeAthleteFromTeam={removeAthleteFromTeam} /></ProtectedRoute>} />
          <Route path="/admin/partidas" element={<ProtectedRoute><AdminMatchesPage /></ProtectedRoute>} />
          <Route path="/admin/partidas/:id/resultado" element={<ProtectedRoute><AdminMatchResultPage updateMatchResult={updateMatchResult} getMatchDetail={getMatchDetail} /></ProtectedRoute>} />
          <Route path="/admin/partidas/:id/editar" element={<ProtectedRoute><AdminMatchEditPage getMatchDetail={getMatchDetail} updateMatch={updateMatch} listVenues={listVenues} listReferees={listReferees} /></ProtectedRoute>} />
          <Route path="/admin/arbitros" element={<ProtectedRoute><AdminRefereesPage listReferees={listReferees} deleteReferee={deleteReferee} /></ProtectedRoute>} />
          <Route path="/admin/arbitros/novo" element={<ProtectedRoute><AdminRefereeCreatePage createReferee={createReferee} /></ProtectedRoute>} />
          <Route path="/admin/arbitros/:id/editar" element={<ProtectedRoute><AdminRefereeEditPage updateReferee={updateReferee} deleteReferee={deleteReferee} refereeRepository={refereeRepository} /></ProtectedRoute>} />
          <Route path="/admin/pendencias-vinculo" element={<ProtectedRoute><AdminMembershipPendingPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Navigate to="/admin/pendencias-vinculo" replace /></ProtectedRoute>} />
          <Route path="/admin/dirigentes" element={<ProtectedRoute role="full_admin"><AdminDirigentesPage /></ProtectedRoute>} />
          <Route path="/admin/usuarios" element={<ProtectedRoute role="full_admin"><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/admin/league-admins" element={<ProtectedRoute role="full_admin"><AdminLeagueAdminsPage /></ProtectedRoute>} />
          <Route path="/admin/dirigentes" element={<ProtectedRoute role="full_admin"><AdminDirigentesPage /></ProtectedRoute>} />
          <Route path="/admin/usuarios" element={<ProtectedRoute role="full_admin"><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/admin/league-admins" element={<ProtectedRoute role="full_admin"><AdminLeagueAdminsPage /></ProtectedRoute>} />
          {/* <Route path="/admin/usuarios/novo" element={<ProtectedRoute><AdminUserCreatePage /></ProtectedRoute>} /> */}
        </Routes>
        </div>
        <Footer />
        </div>
        </ActiveLeagueProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
