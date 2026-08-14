// app.jsx — Main router for the "Hey" prototype. iPhone frame + screen rail.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "browseStyle": "swipe",
  "density": "roomy",
  "matchAnimation": "hearts",
  "offline": false,
  "loading": false,
  "accent": "#FF5A5F"
}/*EDITMODE-END*/;

// All routable screens with labels for the rail. Index helps user navigate.
const ROUTES = [
  { group: 'Onboarding', items: [
    { id: 'splash', label: 'Welcome' },
    { id: 'phone', label: 'Phone number' },
    { id: 'otp', label: 'OTP code' },
    { id: 'otp-wrong', label: 'OTP · wrong code' },
    { id: 'name', label: 'Name + birthday' },
    { id: 'gender', label: 'Q · gender' },
    { id: 'lookingfor', label: 'Q · looking for' },
    { id: 'relationship', label: 'Q · relationship' },
    { id: 'height', label: 'Q · height' },
    { id: 'work', label: 'Q · work & school' },
    { id: 'pronouns', label: 'Q · pronouns' },
    { id: 'starsign', label: 'Q · star sign' },
    { id: 'lifestyle', label: 'Q · lifestyle' },
    { id: 'values', label: 'Q · values' },
    { id: 'interests', label: 'Q · interests' },
    { id: 'prompts', label: 'Q · prompts' },
    { id: 'bio', label: 'Q · bio' },
    { id: 'photo', label: 'Upload photos' },
    { id: 'email-pass', label: 'Email + password' },
    { id: 'verify', label: 'Verify selfie' },
    { id: 'verify-pending', label: 'Verify · pending' },
    { id: 'verify-done', label: 'Verify · success' },
    { id: 'verify-rejected', label: 'Verify · rejected' },
    { id: 'login', label: 'Log in' },
  ]},
  { group: 'Discover', items: [
    { id: 'discover', label: 'Discover feed' },
    { id: 'discover-loading', label: 'Discover · skeleton' },
    { id: 'profile-detail', label: 'Profile · carousel' },
    { id: 'like-photo', label: 'Like + comment · photo' },
    { id: 'like-prompt', label: 'Like + comment · prompt' },
    { id: 'match', label: "It's a match" },
    { id: 'empty-discover', label: 'No more profiles' },
    { id: 'out-of-radius', label: 'Out of radius' },
    { id: 'likes-you', label: 'Likes you' },
  ]},
  { group: 'Out · Spots', items: [
    { id: 'places', label: 'Spots · map' },
    { id: 'places-list', label: 'Spots · list' },
    { id: 'search-places', label: 'Search · spots' },
    { id: 'place-detail', label: 'Spot detail' },
    { id: 'place-checked-in', label: 'Spot · checked in' },
  ]},
  { group: 'Out · Events', items: [
    { id: 'events', label: 'Events list' },
    { id: 'event-detail', label: 'Event detail' },
    { id: 'event-going', label: 'Event · going' },
  ]},
  { group: 'Chats', items: [
    { id: 'chats', label: 'Matches & chats' },
    { id: 'search-chats', label: 'Search · chats' },
    { id: 'chat', label: 'Chat · photo anchor' },
    { id: 'chat-prompt', label: 'Chat · prompt anchor' },
    { id: 'chat-offline', label: 'Chat · offline retry' },
    { id: 'empty-chats', label: 'No matches yet' },
  ]},
  { group: 'Me', items: [
    { id: 'me', label: 'My profile' },
    { id: 'edit', label: 'Edit profile' },
    { id: 'edit-pronouns', label: '— Edit pronouns' },
    { id: 'edit-height', label: '— Edit height' },
    { id: 'edit-starsign', label: '— Edit star sign' },
    { id: 'edit-drinks', label: '— Edit drinks' },
    { id: 'edit-smokes', label: '— Edit smokes' },
    { id: 'edit-exercise', label: '— Edit exercise' },
    { id: 'edit-kids', label: '— Edit kids' },
    { id: 'edit-relationship', label: '— Edit relationship' },
    { id: 'edit-school', label: '— Edit school' },
    { id: 'edit-job', label: '— Edit job' },
    { id: 'filters', label: 'Filters' },
    { id: 'pause', label: 'Pause / hide / ghost' },
    { id: 'settings', label: 'Settings' },
    { id: 'set-phone', label: '— Phone number' },
    { id: 'set-verify', label: '— Verification' },
    { id: 'set-privacy', label: '— Privacy & safety' },
    { id: 'safety-center', label: '— — Safety center' },
    { id: 'emergency', label: '— — Emergency contact' },
    { id: 'reported', label: '— — Reported accounts' },
    { id: 'blocked', label: '— — Blocked accounts' },
    { id: 'set-notifs', label: '— Notifications' },
    { id: 'set-location', label: '— Location' },
    { id: 'set-whosees', label: '— Who sees me' },
    { id: 'legal-guidelines', label: '— Guidelines' },
    { id: 'legal-terms', label: '— Terms' },
    { id: 'legal-privacy', label: '— Privacy policy' },
    { id: 'notifs', label: 'Activity' },
  ]},
  { group: 'System', items: [
    { id: 'perm-push', label: 'Permission · push' },
    { id: 'perm-camera', label: 'Permission · camera' },
    { id: 'perm-location', label: 'Permission · location' },
    { id: 'offline', label: 'No signal · full' },
  ]},
];

function Rail({ screen, go }) {
  return (
    <div className="rail">
      <div className="rail-brand">hey<span className="dot" /></div>
      <div className="rail-tag">GEN Z · IOS · DATING · PROTO v2</div>

      {ROUTES.map(g => (
        <div key={g.group}>
          <div className="rail-section">{g.group}</div>
          {g.items.map((r, i) => (
            <button
              key={r.id}
              className={`rail-link ${screen === r.id ? 'active' : ''}`}
              onClick={() => go(r.id)}
            >
              <span className="n">{String(i + 1).padStart(2, '0')}</span>
              {r.label}
            </button>
          ))}
        </div>
      ))}

      <div style={{ height: 30 }} />
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', lineHeight: 1.5, padding: '0 6px' }}>
        TIP — toggle <b>Tweaks</b> for browse style / density / match animation / offline.
      </div>
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = React.useState('splash');
  const [tab, setTab] = React.useState('discover');

  // Scale the iPhone bezel to fit any viewport — keeps the inside at 1:1
  // (logical px == device px) so layouts stay pixel-honest; only the outer
  // shell shrinks. Recomputes on resize.
  const [scale, setScale] = React.useState(1);
  React.useEffect(() => {
    const DEVICE_H = 874, DEVICE_W = 402, PAD = 32;
    const compute = () => {
      const availH = window.innerHeight - PAD * 2;
      const availW = Math.max(320, window.innerWidth - 280 - PAD * 2); // rail = 280
      const s = Math.min(1, availH / DEVICE_H, availW / DEVICE_W);
      setScale(s);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // Active action sheet — one at a time
  const [actionSheet, setActionSheet] = React.useState(null);
  // shape: { kind: 'report-profile' | 'report-spot' | 'unmatch' | 'block' | 'share-profile' | 'share-spot', id }

  // shared state across screens
  const [phone, setPhone] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [otpError, setOtpError] = React.useState(false);
  const [name, setName] = React.useState('');
  const [dob, setDob] = React.useState('');
  const [gender, setGender] = React.useState('');
  const [lookingFor, setLookingFor] = React.useState(['women']);
  const [relationship, setRelationship] = React.useState('');
  const [height, setHeight] = React.useState(66);
  const [job, setJob] = React.useState('');
  const [school, setSchool] = React.useState('');
  const [pronouns, setPronouns] = React.useState('');
  const [starSign, setStarSign] = React.useState('');
  const [lifestyle, setLifestyle] = React.useState({});
  const [valuesAns, setValuesAns] = React.useState({});
  const [interests, setInterests] = React.useState([]);
  const [onbPrompts, setOnbPrompts] = React.useState([null, null, null]);
  const [bio, setBio] = React.useState("i make decent pasta, i'm bad at parallel parking, ask me about my hot takes on early 2000s rom-coms.");
  const [photos, setPhotos] = React.useState([true, true, true, true, false, false]);
  const [verifyState, setVerifyState] = React.useState('initial');

  const [activePerson, setActivePerson] = React.useState('maya');
  const [likeAnchor, setLikeAnchor] = React.useState(null);
  const [activePlace, setActivePlace] = React.useState('attaboy');
  const [checkinPlace, setCheckinPlace] = React.useState(null);
  const [placesView, setPlacesView] = React.useState('map');
  const [outMode, setOutMode] = React.useState('spots');
  const [activeEvent, setActiveEvent] = React.useState('nophone');
  const [savedEvents, setSavedEvents] = React.useState(['matchawork']);
  const [rsvpd, setRsvpd] = React.useState(['datetrivia']);
  const [activeMatch, setActiveMatch] = React.useState('maya');

  // Email + password (backup login) — collected at end of onboarding
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  // Saved spots (favorites) — toggle from spot detail header
  const [savedSpots, setSavedSpots] = React.useState(['attaboy', 'parchm']);

  // toast state
  const [toast, setToast] = React.useState(null);

  // Routing — every rail target maps to a sequence of state mutations
  const go = (id) => {
    if (id === 'verify-pending')  { setVerifyState('pending');  setScreen('verify'); return; }
    if (id === 'verify-done')     { setVerifyState('done');     setScreen('verify'); return; }
    if (id === 'verify-rejected') { setVerifyState('rejected'); setScreen('verify'); return; }
    if (id === 'verify')          { setVerifyState('initial');  setScreen('verify'); return; }
    if (id === 'otp-wrong')       { setOtpError(true); setOtp(''); setScreen('otp'); return; }
    if (id === 'otp')             { setOtpError(false); setScreen('otp'); return; }

    if (id === 'main')             { setScreen('main'); setTab('discover'); return; }
    if (id === 'profile-detail')   { setActivePerson('maya'); setScreen('profile-detail'); return; }
    if (id === 'like-photo')       { setActivePerson('maya'); setLikeAnchor({ kind: 'photo', photoIdx: 2 }); setScreen('like-comment'); return; }
    if (id === 'like-prompt')      { setActivePerson('maya'); setLikeAnchor({ kind: 'prompt', q: PEOPLE[0].prompts[0].q, a: PEOPLE[0].prompts[0].a }); setScreen('like-comment'); return; }
    if (id === 'match')            { setActivePerson('simone'); setScreen('match'); return; }
    if (id === 'discover-loading') { setScreen('discover-loading'); return; }
    if (id === 'out-of-radius')    { setScreen('out-of-radius'); return; }

    if (id === 'places-list')      { setOutMode('spots'); setPlacesView('list'); setScreen('main'); setTab('places'); return; }
    if (id === 'places')           { setOutMode('spots'); setPlacesView('map');  setScreen('main'); setTab('places'); return; }
    if (id === 'place-detail')     { setActivePlace('attaboy'); setCheckinPlace(null); setScreen('place-detail'); return; }
    if (id === 'place-checked-in'){ setActivePlace('parchm');  setCheckinPlace('parchm'); setScreen('place-detail'); return; }

    if (id === 'events')           { setOutMode('events'); setScreen('main'); setTab('places'); return; }
    if (id === 'event-detail')     { setActiveEvent('nophone'); setScreen('event-detail'); return; }
    if (id === 'event-going')      { setActiveEvent('datetrivia'); if (!rsvpd.includes('datetrivia')) setRsvpd([...rsvpd, 'datetrivia']); setScreen('event-detail'); return; }

    if (id === 'search-places')    { setScreen('search-places'); return; }
    if (id === 'search-chats')     { setScreen('search-chats'); return; }
    if (id === 'discover')         { setScreen('main'); setTab('discover'); return; }
    if (id === 'chats')            { setScreen('main'); setTab('chats'); return; }
    if (id === 'me')               { setScreen('main'); setTab('me'); return; }
    if (id === 'chat')             { setActiveMatch('maya'); setScreen('chat'); return; }
    if (id === 'chat-prompt')      { setActiveMatch('simone'); setScreen('chat'); return; }
    if (id === 'chat-offline')     { setActiveMatch('maya'); setTweak('offline', true); setScreen('chat'); return; }
    if (id === 'edit')             { setScreen('edit'); return; }
    if (id === 'filters')          { setScreen('filters'); return; }
    if (id === 'pause')            { setScreen('pause'); return; }
    if (id === 'settings')         { setScreen('settings'); return; }
    if (id === 'notifs')           { setScreen('notifs'); return; }
    if (id === 'likes-you')        { setScreen('likes-you'); return; }
    if (id === 'empty-discover')   { setScreen('empty-discover'); return; }
    if (id === 'empty-chats')      { setScreen('empty-chats'); return; }
    if (id === 'offline')          { setScreen('offline-full'); return; }
    setScreen(id);
  };

  const onbGo = (id) => { if (id === 'main') { go('main'); return; } go(id); };

  const openProfile = (id) => { setActivePerson(id); setScreen('profile-detail'); };
  const openLike = (id, anchor) => { setActivePerson(id); setLikeAnchor(anchor || { kind: 'photo', photoIdx: 0 }); setScreen('like-comment'); };
  const openPlace = (id) => { setActivePlace(id); setScreen('place-detail'); };
  const openEvent = (id) => { setActiveEvent(id); setScreen('event-detail'); };
  const openChat = (id) => { setActiveMatch(id); setScreen('chat'); };

  const toggleSaveEvent = (id) => {
    setSavedEvents(savedEvents.includes(id) ? savedEvents.filter(x => x !== id) : [...savedEvents, id]);
  };
  const toggleSaveSpot = (id) => {
    setSavedSpots(savedSpots.includes(id) ? savedSpots.filter(x => x !== id) : [...savedSpots, id]);
  };
  const leaveCheckin = () => { setCheckinPlace(null); };
  const toggleRsvp = (id) => {
    setRsvpd(rsvpd.includes(id) ? rsvpd.filter(x => x !== id) : [...rsvpd, id]);
  };

  const doCheckIn = (id) => {
    setCheckinPlace(id);
    setToast({ kind: 'checkin', placeId: id });
    if (screen !== 'place-detail') { setScreen('main'); setTab('places'); setPlacesView('map'); }
  };

  // The like sheet's confirm: simulate a match where the comment + photo anchor
  // stick. We mutate MATCHES so when the user opens the chat after the match
  // moment, the anchor pill at the top shows the right photo + their comment.
  const sendLike = (id, comment, anchor) => {
    const existing = MATCHES.find(m => m.id === id);
    if (existing) {
      existing.anchor = anchor && anchor.kind === 'photo'
        ? { ...anchor, comment: comment || null }
        : anchor && anchor.kind === 'prompt'
          ? { ...anchor, comment: comment || null }
          : { kind: 'photo', photoIdx: 0, comment: comment || null };
      existing.isNew = true;
      existing.unread = 0;
    }
    setScreen('match');
  };

  // ─────────────────────────────────────────────────────────
  // Render one screen
  // ─────────────────────────────────────────────────────────
  const renderScreen = () => {
    if (screen === 'splash') return <ScreenSplash go={onbGo} />;
    if (screen === 'phone')  return <ScreenPhone  go={onbGo} phone={phone} setPhone={setPhone} />;
    if (screen === 'otp')    return <ScreenOtp    go={onbGo} otp={otp} setOtp={setOtp} otpError={otpError} setOtpError={setOtpError} />;
    if (screen === 'name')         return <ScreenName   go={onbGo} name={name} setName={setName} dob={dob} setDob={setDob} />;
    if (screen === 'gender')       return <QGender      go={onbGo} gender={gender} setGender={setGender} />;
    if (screen === 'lookingfor')   return <QLookingFor  go={onbGo} lookingFor={lookingFor} setLookingFor={setLookingFor} />;
    if (screen === 'relationship') return <QRelationship go={onbGo} relationship={relationship} setRelationship={setRelationship} />;
    if (screen === 'height')       return <QHeight      go={onbGo} height={height} setHeight={setHeight} />;
    if (screen === 'work')         return <QWork        go={onbGo} job={job} setJob={setJob} school={school} setSchool={setSchool} />;
    if (screen === 'pronouns')     return <QPronouns    go={onbGo} pronouns={pronouns} setPronouns={setPronouns} />;
    if (screen === 'starsign')     return <QStarSign    go={onbGo} starSign={starSign} setStarSign={setStarSign} />;
    if (screen === 'lifestyle')    return <QLifestyle   go={onbGo} lifestyle={lifestyle} setLifestyle={setLifestyle} />;
    if (screen === 'values')       return <QValues      go={onbGo} values={valuesAns} setValues={setValuesAns} />;
    if (screen === 'interests')    return <QInterests   go={onbGo} interests={interests} setInterests={setInterests} />;
    if (screen === 'prompts')      return <QPrompts     go={onbGo} prompts={onbPrompts} setPrompts={setOnbPrompts} />;
    if (screen === 'bio')          return <ScreenBio    go={onbGo} bio={bio} setBio={setBio} />;
    if (screen === 'photo')  return <ScreenPhoto  go={onbGo} photos={photos} setPhotos={setPhotos} />;
    if (screen === 'verify') return <ScreenVerify go={onbGo} verifyState={verifyState} setVerifyState={setVerifyState} />;

    if (screen === 'search-places') return <ScreenSearchPlaces onClose={() => { setScreen('main'); setTab('places'); }} openPlace={openPlace} />;
    if (screen === 'search-chats')  return <ScreenSearchChats onClose={() => { setScreen('main'); setTab('chats'); }} openChat={openChat} />;
    if (screen === 'profile-detail') return <ScreenProfile personId={activePerson} onClose={() => setScreen('main')} onLike={openLike} openSheet={setActionSheet} />;
    if (screen === 'place-detail')   return <ScreenPlaceDetail placeId={activePlace} onClose={() => { setScreen('main'); setTab('places'); }} openProfile={openProfile} doCheckIn={doCheckIn} checkinPlace={checkinPlace} savedSpots={savedSpots} toggleSaveSpot={toggleSaveSpot} leaveCheckin={leaveCheckin} />;
    if (screen === 'event-detail')   return <ScreenEventDetail eventId={activeEvent} onClose={() => { setScreen('main'); setTab('places'); setOutMode('events'); }} openProfile={openProfile} savedEvents={savedEvents} toggleSave={toggleSaveEvent} rsvpd={rsvpd} toggleRsvp={toggleRsvp} />;
    if (screen === 'chat')           return <ScreenChat matchId={activeMatch} onClose={() => { setScreen('main'); setTab('chats'); }} openProfile={openProfile} offline={t.offline} openSheet={setActionSheet} />;
    if (screen === 'edit')           return <ScreenEdit onClose={() => { setScreen('main'); setTab('me'); }} go={(id) => setScreen(id)} />;
    if (screen === 'edit-pronouns')    return <EditPronouns onClose={() => setScreen('edit')} />;
    if (screen === 'edit-height')      return <EditHeight onClose={() => setScreen('edit')} />;
    if (screen === 'edit-starsign')    return <EditStarSign onClose={() => setScreen('edit')} />;
    if (screen === 'edit-drinks')      return <EditDrinks onClose={() => setScreen('edit')} />;
    if (screen === 'edit-smokes')      return <EditSmokes onClose={() => setScreen('edit')} />;
    if (screen === 'edit-exercise')    return <EditExercise onClose={() => setScreen('edit')} />;
    if (screen === 'edit-kids')        return <EditKids onClose={() => setScreen('edit')} />;
    if (screen === 'edit-relationship') return <EditRelationship onClose={() => setScreen('edit')} />;
    if (screen === 'edit-school')      return <EditSchool onClose={() => setScreen('edit')} />;
    if (screen === 'edit-job')         return <EditJob onClose={() => setScreen('edit')} />;
    if (screen === 'perm-push')        return <PermPush onAllow={() => setScreen('main')} onLater={() => setScreen('main')} />;
    if (screen === 'perm-camera')      return <PermCamera onAllow={() => setScreen('photo')} onLater={() => setScreen('photo')} />;
    if (screen === 'perm-location')    return <PermLocation onAllow={() => setScreen('main')} onLater={() => setScreen('main')} />;
    if (screen === 'filters')        return <ScreenFilters onClose={() => setScreen('main')} />;
    if (screen === 'pause')          return <ScreenPause onClose={() => { setScreen('main'); setTab('me'); }} />;
    if (screen === 'settings')       return <ScreenSettings onClose={() => { setScreen('main'); setTab('me'); }} go={(id) => go(id)} />;
    // Settings sub-screens
    if (screen === 'set-phone')      return <ScreenSetPhone onClose={() => setScreen('settings')} />;
    if (screen === 'set-verify')     return <ScreenSetVerify onClose={() => setScreen('settings')} />;
    if (screen === 'set-privacy')    return <ScreenSetPrivacy onClose={() => setScreen('settings')} go={(id) => setScreen(id)} />;
    if (screen === 'safety-center')  return <ScreenSafetyCenter onClose={() => setScreen('set-privacy')} />;
    if (screen === 'emergency')      return <ScreenEmergencyContact onClose={() => setScreen('set-privacy')} />;
    if (screen === 'reported')       return <ScreenReported onClose={() => setScreen('set-privacy')} />;
    if (screen === 'blocked')        return <ScreenBlocked onClose={() => setScreen('set-privacy')} />;
    if (screen === 'set-notifs')     return <ScreenSetNotifs onClose={() => setScreen('settings')} />;
    if (screen === 'set-location')   return <ScreenSetLocation onClose={() => setScreen('settings')} />;
    if (screen === 'set-whosees')    return <ScreenSetWhoSees onClose={() => setScreen('settings')} />;
    if (screen === 'legal-guidelines') return <ScreenGuidelines onClose={() => setScreen('settings')} />;
    if (screen === 'legal-terms')    return <ScreenTerms onClose={() => setScreen('settings')} />;
    if (screen === 'legal-privacy')  return <ScreenPrivacyPolicy onClose={() => setScreen('settings')} />;
    if (screen === 'email-pass')     return <ScreenEmailPass go={onbGo} email={email} setEmail={setEmail} password={password} setPassword={setPassword} />;
    if (screen === 'login')          return <ScreenLogin go={onbGo} />;
    if (screen === 'notifs')         return <ScreenNotifs onClose={() => setScreen('main')} />;
    if (screen === 'likes-you')      return <ScreenLikesYou onClose={() => setScreen('main')} openProfile={openProfile} />;
    if (screen === 'empty-discover') return <ScreenEmptyDiscover goPlaces={() => { setScreen('main'); setTab('places'); }} openFilters={() => setScreen('filters')} />;
    if (screen === 'empty-chats')    return <ScreenEmptyChats goDiscover={() => { setScreen('main'); setTab('discover'); }} />;
    if (screen === 'out-of-radius')  return <div className="screen"><ScreenOutOfRadius goDiscover={() => { setScreen('main'); setTab('discover'); }} openPlaces={() => { setScreen('main'); setTab('places'); }} /><TabBar active="discover" onChange={(x) => { setScreen('main'); setTab(x); }} /></div>;
    if (screen === 'discover-loading') return <div className="screen"><ScreenDiscoverSkeleton /><TabBar active="discover" onChange={(x) => { setScreen('main'); setTab(x); }} /></div>;
    if (screen === 'offline-full')   return <div className="screen"><ScreenOffline onRetry={() => setScreen('main')} /><TabBar active={tab} onChange={(x) => { setScreen('main'); setTab(x); }} /></div>;

    if (screen === 'match') {
      return (
        <MatchMoment
          personId={activePerson}
          animation={t.matchAnimation}
          onChat={() => { setActiveMatch(activePerson); setScreen('chat'); }}
          onKeep={() => { setScreen('main'); setTab('discover'); }}
        />
      );
    }

    if (screen === 'like-comment') {
      const p = PEOPLE.find(x => x.id === activePerson) ?? PEOPLE[0];
      const anchor = likeAnchor || { kind: 'photo', photoIdx: 0 };
      return (
        <>
          <ScreenProfile personId={activePerson} onClose={() => setScreen('main')} onLike={openLike} />
          <LikeSheet
            personId={activePerson}
            anchor={anchor}
            onClose={() => setScreen('profile-detail')}
            onSend={sendLike}
          />
        </>
      );
    }

    // Main app — tab-driven
    const loading = t.loading;
    return (
      <div className="screen">
        {t.offline && tab === 'discover' && (
          <div style={{ background: 'var(--ink)', color: '#fff', padding: '6px 14px', fontSize: 11.5, textAlign: 'center', fontFamily: 'var(--mono)', letterSpacing: 0.06 }}>
            • OFFLINE — SHOWING CACHED PROFILES
          </div>
        )}
        {tab === 'discover' && (
          loading ? <ScreenDiscoverSkeleton /> : (
            <ScreenDiscover
              browseStyle={t.browseStyle}
              density={t.density === 'compact' ? 'compact' : 'roomy'}
              openProfile={openProfile}
              openLike={openLike}
              openFilters={() => setScreen('filters')}
              openSheet={setActionSheet}
            />
          )
        )}
        {tab === 'places' && (
          <ScreenPlaces
            checkinPlace={checkinPlace}
            openPlace={openPlace}
            openEvent={openEvent}
            openSearch={() => setScreen('search-places')}
            openFilters={() => setScreen('filters')}
            doCheckIn={doCheckIn}
            view={placesView}
            setView={setPlacesView}
            outMode={outMode}
            setOutMode={setOutMode}
            savedEvents={savedEvents}
            toggleSave={toggleSaveEvent}
          />
        )}
        {tab === 'chats' && (
          <ScreenChats openChat={openChat} openSearch={() => setScreen('search-chats')} openLikesYou={() => setScreen('likes-you')} openNotifs={() => setScreen('notifs')} />
        )}
        {tab === 'me' && (
          <ScreenMe
            name={name || 'maya'}
            openEdit={() => setScreen('edit')}
            openSettings={() => setScreen('settings')}
            openFilters={() => setScreen('filters')}
            openPause={() => setScreen('pause')}
            openPlace={openPlace}
            openEvent={openEvent}
            savedSpots={savedSpots}
            savedEvents={savedEvents}
          />
        )}
        <TabBar active={tab} onChange={setTab} />
        {toast && toast.kind === 'checkin' && (
          <CheckinToast placeId={toast.placeId} onClose={() => setToast(null)} />
        )}
      </div>
    );
  };

  return (
    <div className="stage">
      <Rail screen={screen} go={go} />
      <div className="device-wrap">
        <div style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          transition: 'transform 120ms',
        }}>
          <IOSDevice width={402} height={874}>
            {renderScreen()}
            {actionSheet && actionSheet.kind === 'report-profile' && <ReportProfileSheet personId={actionSheet.id} onClose={() => setActionSheet(null)} />}
            {actionSheet && actionSheet.kind === 'report-spot' && <ReportSpotSheet placeId={actionSheet.id} onClose={() => setActionSheet(null)} />}
            {actionSheet && actionSheet.kind === 'report-event' && <ReportEventSheet eventId={actionSheet.id} onClose={() => setActionSheet(null)} />}
            {actionSheet && actionSheet.kind === 'unmatch' && <UnmatchSheet matchId={actionSheet.id} onClose={() => setActionSheet(null)} onConfirm={() => { setActionSheet(null); setScreen('main'); setTab('chats'); }} />}
            {actionSheet && actionSheet.kind === 'block' && <BlockSheet personId={actionSheet.id} onClose={() => setActionSheet(null)} onConfirm={() => { setActionSheet(null); setScreen('main'); }} />}
            {actionSheet && actionSheet.kind === 'share-spot' && <ShareSheet kind="spot" id={actionSheet.id} onClose={() => setActionSheet(null)} />}
          </IOSDevice>
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Browse">
          <TweakRadio
            label="Style"
            value={t.browseStyle}
            options={[
              { value: 'swipe',  label: 'stack' },
              { value: 'scroll', label: 'feed' },
              { value: 'grid',   label: 'grid' },
            ]}
            onChange={(v) => setTweak('browseStyle', v)}
          />
          <TweakRadio
            label="Density"
            value={t.density}
            options={[
              { value: 'roomy',   label: 'roomy' },
              { value: 'compact', label: 'compact' },
            ]}
            onChange={(v) => setTweak('density', v)}
          />
          <TweakToggle label="show skeleton" value={t.loading} onChange={(v) => setTweak('loading', v)} />
        </TweakSection>

        <TweakSection label="Match Moment">
          <TweakSelect
            label="Animation"
            value={t.matchAnimation}
            options={[
              { value: 'confetti', label: 'confetti shower' },
              { value: 'hearts',   label: 'floating hearts' },
              { value: 'paper',    label: 'paper fold' },
              { value: 'minimal',  label: 'minimal (still)' },
            ]}
            onChange={(v) => setTweak('matchAnimation', v)}
          />
          <TweakButton label="play match again →" onClick={() => { setActivePerson('simone'); setScreen('match'); }} />
        </TweakSection>

        <TweakSection label="System">
          <TweakToggle label="offline mode" value={t.offline} onChange={(v) => setTweak('offline', v)} />
        </TweakSection>

        <TweakSection label="Action sheets">
          <TweakButton label="report profile" onClick={() => setActionSheet({ kind: 'report-profile', id: 'maya' })} secondary />
          <TweakButton label="report spot" onClick={() => setActionSheet({ kind: 'report-spot', id: 'attaboy' })} secondary />
          <TweakButton label="report event" onClick={() => setActionSheet({ kind: 'report-event', id: 'nophone' })} secondary />
          <TweakButton label="unmatch" onClick={() => setActionSheet({ kind: 'unmatch', id: 'maya' })} secondary />
          <TweakButton label="block" onClick={() => setActionSheet({ kind: 'block', id: 'maya' })} secondary />
          <TweakButton label="share spot" onClick={() => setActionSheet({ kind: 'share-spot', id: 'attaboy' })} secondary />
        </TweakSection>

        <TweakSection label="Jump">
          <TweakButton label="onboarding" onClick={() => go('splash')} secondary />
          <TweakButton label="main app" onClick={() => go('main')} secondary />
          <TweakButton label="events list" onClick={() => go('events')} secondary />
          <TweakButton label="event detail" onClick={() => go('event-detail')} secondary />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
