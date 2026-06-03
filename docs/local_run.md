# Local Run

프로젝트 루트에서 백엔드 API와 프론트엔드 정적 파일을 하나의 서버로 실행한다.

```bash
npm start
```

브라우저 접속 주소:

```text
http://127.0.0.1:4000
```

백엔드는 `/api/*` 요청을 처리하고, 그 외 GET 요청에는 `frontend` 폴더의 정적 파일을 제공한다. 프론트엔드는 같은 출처의 `/api` 경로를 호출하므로 별도 프론트 서버를 실행할 필요가 없다.

화면 경로:

```text
/
/home
/search
/favorites
/login
/signup
/account
/summary/1
```

주요 확인 주소:

```text
http://127.0.0.1:4000/
http://127.0.0.1:4000/api/health
http://127.0.0.1:4000/api/health/db
```

기존 `frontend/server.js`는 정적 화면만 독립적으로 확인할 때 사용할 수 있다. 전체 기능을 확인할 때는 프로젝트 루트의 `npm start`를 사용한다.
