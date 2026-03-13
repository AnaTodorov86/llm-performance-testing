FROM grafana/k6:latest

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

ENV K6_OUT=k6-json
ENV K6_REPORT_PREFIX=test-run

RUN mkdir -p /app/reports

CMD ["run", \
     "--out", "json=/app/reports/results.json", \
     "--summary-export=/app/reports/summary.json", \
     "tests/performance_test.js"]
