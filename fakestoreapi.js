import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const URL = __ENV.URL || 'https://fakestoreapi.com/auth/login';

const users = new SharedArray('users', function () {
  const lines = open('./users.csv').split('\n');

  const out = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;

    const parts = lines[i].split(',');

    if (parts.length < 2) continue;

    out.push({
      user: parts[0],
      passwd: parts[1],
    });
  }

  return out;
});

export const options = {
  scenarios: {
    login_test: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 20,
      maxVUs: 100,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.03'],
  },
};

export default function () {
  const user = users[Math.floor(Math.random() * users.length)];
  const body = JSON.stringify({
    username: user.user,
    password: user.passwd,
  });

  const res = http.post(URL, body, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  let okToken = false;

  if (res.status === 201) {
    const body = res.json();
    okToken = body && body.token && body.token.length > 20;
  }

  check(res, {
    'status OK': (r) => r.status === 201,
    'token exists': () => okToken,
  });
}